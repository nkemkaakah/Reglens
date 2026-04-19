import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { z } from 'zod'
import { config } from '../config.js'
import { HttpError } from '../httpError.js'
import { log } from '../log.js'
import type { ControlSummary, ObligationDetail, SystemSummary } from '../types/upstream.js'

const SuggestionSchema = z.object({
  kind: z.enum(['control', 'system']),
  id: z.string().uuid(),
  ref: z.string(),
  title: z.string(),
  confidence: z.number().min(0).max(1),
  confidenceRationale: z.string(),
  explanation: z.string(),
})

const LlmEnvelopeSchema = z.object({
  suggestions: z.array(SuggestionSchema),
})

/**
 * JSON schema for Claude structured outputs (`output_config.format`), aligned with
 * {@link LlmEnvelopeSchema} — explicit properties, required keys, `additionalProperties: false`.
 */
const SUGGEST_MAPPINGS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['control', 'system'] },
          id: { type: 'string' },
          ref: { type: 'string' },
          title: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          confidenceRationale: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['kind', 'id', 'ref', 'title', 'confidence', 'confidenceRationale', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const

export type MappingSuggestion = z.infer<typeof SuggestionSchema>

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '\n[truncated]'
}

function buildUserPayload(
  obligation: ObligationDetail,
  controls: ControlSummary[],
  systems: SystemSummary[],
): string {
  const compactObligation = {
    id: obligation.id,
    ref: obligation.ref,
    title: obligation.title,
    summary: obligation.summary,
    fullText: truncate(obligation.fullText, config.obligationFullTextMaxChars),
    sectionRef: obligation.sectionRef,
    topics: obligation.topics ?? [],
    aiPrinciples: obligation.aiPrinciples ?? [],
    riskRating: obligation.riskRating,
    status: obligation.status,
    regulator: obligation.regulator,
    documentRef: obligation.documentRef,
  }
  return JSON.stringify(
    {
      obligation: compactObligation,
      controls: controls.map((c) => ({
        id: c.id,
        ref: c.ref,
        category: c.category,
        title: c.title,
        description: truncate(c.description, 2000),
      })),
      systems: systems.map((s) => ({
        id: s.id,
        ref: s.ref,
        displayName: s.displayName,
        domain: s.domain,
        description: s.description ? truncate(s.description, 2000) : '',
      })),
    },
    null,
    2,
  )
}

const SYSTEM_PROMPT = `You are a regulatory compliance assistant for Nexus Bank (fictional UK bank).
Given one regulatory "obligation" and lists of internal "controls" and "systems", propose which catalogue items are most relevant to implementing or evidencing that obligation.

Rules:
- Respond with structured JSON matching the configured schema (suggestions array only).
- For kind "control", "title" is the control title from the input.
- For kind "system", "title" is the system's displayName from the input.
- "id" MUST be copied exactly from the input arrays — never invent UUIDs.
- Prefer precision over volume: at most 12 suggestions total, ranked most relevant first.
- "confidence" (0 to 1): how well the semantic and conceptual content of that control or system description addresses the obligation text (title, summary, fullText). 1.0 = direct, precise alignment; 0.0 = no meaningful overlap. Base this on comparing obligation wording to the catalogue description fields you were given — not on external data.
- "confidenceRationale": exactly one sentence naming which phrases or themes in the obligation vs the control/system description drove the score.
- "explanation": a fuller rationale for the reviewer (how the mapping would work in practice).`

/**
 * Calls Anthropic Messages API with JSON-schema structured output, then validates and filters
 * suggestions to catalogue ids that actually exist (guards model hallucinations).
 */
export async function runSuggestMappings(
  obligation: ObligationDetail,
  controls: ControlSummary[],
  systems: SystemSummary[],
): Promise<MappingSuggestion[]> {
  const apiKey = config.anthropicApiKey
  if (!apiKey) {
    throw new HttpError(503, 'ANTHROPIC_API_KEY must be set for suggest-mappings')
  }

  const client = new Anthropic({ apiKey })
  const userContent = buildUserPayload(obligation, controls, systems)

  log.info('Anthropic suggest-mappings request', {
    obligationId: obligation.id,
    controlCandidates: controls.length,
    systemCandidates: systems.length,
  })

  let msg
  try {
    msg = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      output_config: {
        format: jsonSchemaOutputFormat(SUGGEST_MAPPINGS_JSON_SCHEMA),
      },
    })
  } catch (e) {
    log.error('Anthropic API request failed', {
      message: e instanceof Error ? e.message : String(e),
    })
    throw new HttpError(502, 'Anthropic API request failed')
  }

  if (msg.stop_reason === 'refusal') {
    log.warn('Anthropic refusal for suggest-mappings', { obligationId: obligation.id })
    throw new HttpError(422, 'Model refused to suggest mappings for this obligation')
  }
  if (msg.stop_reason === 'max_tokens') {
    log.warn('Anthropic max_tokens during suggest-mappings', { obligationId: obligation.id })
    throw new HttpError(502, 'Model hit token limit during suggest-mappings')
  }

  const parsed = msg.parsed_output
  if (parsed == null) {
    log.warn('Anthropic structured parse returned no parsed_output', {
      stopReason: msg.stop_reason,
      contentTypes: msg.content.map((c) => c.type),
    })
    throw new HttpError(502, 'LLM returned no structured output')
  }

  const envelope = LlmEnvelopeSchema.safeParse(parsed)
  if (!envelope.success) {
    log.warn('LLM JSON failed Zod validation', { issues: envelope.error.flatten() })
    throw new HttpError(502, 'LLM JSON schema validation failed')
  }

  const controlIds = new Set(controls.map((c) => c.id))
  const systemIds = new Set(systems.map((s) => s.id))

  const filtered: MappingSuggestion[] = []
  for (const s of envelope.data.suggestions) {
    if (s.kind === 'control' && controlIds.has(s.id)) {
      filtered.push(s)
      continue
    }
    if (s.kind === 'system' && systemIds.has(s.id)) {
      filtered.push(s)
      continue
    }
    log.warn('Dropped suggestion with unknown or mismatched id', { kind: s.kind, id: s.id })
  }

  log.info('Suggest-mappings completed', { returned: filtered.length, raw: envelope.data.suggestions.length })
  return filtered
}
