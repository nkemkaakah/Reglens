import { Router } from 'express'
import { ZodError, z } from 'zod'
import { randomUUID } from 'node:crypto'
import * as obligationClient from '../clients/obligationClient.js'
import * as catalogClient from '../clients/catalogClient.js'
import { publishMappingSuggested, publishObligationMapped } from '../kafka/producer.js'
import { runSuggestMappings } from '../llm/suggestMappings.js'
import { log } from '../log.js'

const router = Router()

const MappingRejectionBodySchema = z.object({
  catalogueKind: z.enum(['control', 'system']),
  catalogueId: z.string().uuid(),
  rejectedBy: z.string().min(1, 'rejectedBy is required'),
  reason: z.string().optional().nullable(),
})

const SuggestMappingsBodySchema = z.object({
  suggestedBy: z.string().min(1, 'suggestedBy is required'),
})

const ApproveMappingsBodySchema = z.object({
  approvedBy: z.string().min(1, 'approvedBy is required'),
  controls: z
    .array(
      z.object({
        controlId: z.string().uuid(),
        confidence: z.number().min(0).max(1).optional().nullable(),
        explanation: z.string().optional().nullable(),
        source: z.enum(['AI_SUGGESTED', 'MANUAL']).optional(),
      }),
    )
    .default([]),
  systems: z
    .array(
      z.object({
        systemId: z.string().uuid(),
        confidence: z.number().min(0).max(1).optional().nullable(),
        explanation: z.string().optional().nullable(),
        source: z.enum(['AI_SUGGESTED', 'MANUAL']).optional(),
      }),
    )
    .default([]),
})

/**
 * PRD Feature 4 — LLM proposes candidate controls/systems; nothing is persisted here.
 */
router.post('/:obligationId/suggest-mappings', async (req, res, next) => {
  const obligationId = req.params.obligationId
  const authorization = req.headers.authorization ?? ''
  try {
    const body = SuggestMappingsBodySchema.parse(req.body ?? {})
    const obligation = await obligationClient.getObligation(obligationId, authorization)
    const [controls, systems] = await Promise.all([
      catalogClient.fetchAllControls(authorization),
      catalogClient.fetchAllSystems(authorization),
    ])
    if (controls.length === 0 && systems.length === 0) {
      res.status(422).json({
        error: 'Catalogue is empty',
        detail: 'No controls or systems returned from catalog-service — cannot suggest mappings.',
      })
      return
    }
    await obligationClient.postMappingSuggestStarted(obligationId, authorization)
    try {
      await publishMappingSuggested({
        eventId: randomUUID(),
        obligationId,
        suggestedBy: body.suggestedBy,
        occurredAt: new Date().toISOString(),
      })
    } catch (kafkaErr) {
      log.warn('Kafka publish mapping.suggested failed (suggestions still returned)', {
        obligationId,
        message: String(kafkaErr),
      })
    }
    const suggestions = await runSuggestMappings(obligation, controls, systems)
    res.json({ obligationId, suggestions })
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: e.flatten() })
      return
    }
    next(e)
  }
})

/** Records a human rejection of a suggested candidate (obligation-service is source of truth). */
router.post('/:obligationId/mapping-rejections', async (req, res, next) => {
  const obligationId = req.params.obligationId
  const authorization = req.headers.authorization ?? ''
  try {
    const body = MappingRejectionBodySchema.parse(req.body)
    const row = await obligationClient.postMappingRejection(obligationId, {
      catalogueKind: body.catalogueKind,
      catalogueId: body.catalogueId,
      rejectedBy: body.rejectedBy,
      reason: body.reason ?? undefined,
    }, authorization)
    res.status(201).json(row)
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: e.flatten() })
      return
    }
    next(e)
  }
})

/**
 * PRD Feature 4 — persists approved rows via obligation-service, then emits {@code obligation.mapped}.
 */
router.post('/:obligationId/mappings', async (req, res, next) => {
  const obligationId = req.params.obligationId
  const authorization = req.headers.authorization ?? ''
  try {
    const body = ApproveMappingsBodySchema.parse(req.body)
    if (body.controls.length === 0 && body.systems.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        detail: 'Provide at least one control or system mapping to approve.',
      })
      return
    }

    const controlRows: obligationClient.ControlMappingPayload[] = body.controls.map((c) => ({
      controlId: c.controlId,
      confidence: c.confidence ?? undefined,
      explanation: c.explanation ?? undefined,
      source: c.source ?? 'MANUAL',
      approvedBy: body.approvedBy,
    }))

    const systemRows: obligationClient.SystemMappingPayload[] = body.systems.map((s) => ({
      systemId: s.systemId,
      confidence: s.confidence ?? undefined,
      explanation: s.explanation ?? undefined,
      source: s.source ?? 'MANUAL',
      approvedBy: body.approvedBy,
    }))

    // Sequential writes keep logs and obligation-side transactions easier to reason about than Promise.all.
    await obligationClient.postControlMappings(obligationId, controlRows, authorization)
    await obligationClient.postSystemMappings(obligationId, systemRows, authorization)

    await publishObligationMapped({
      eventId: randomUUID(),
      obligationId,
      approvedBy: body.approvedBy,
      controlIds: body.controls.map((c) => c.controlId),
      systemIds: body.systems.map((s) => s.systemId),
      occurredAt: new Date().toISOString(),
    })

    log.info('Mappings approved and event emitted', {
      obligationId,
      controls: body.controls.length,
      systems: body.systems.length,
    })

    res.status(200).json({
      obligationId,
      persisted: { controls: body.controls.length, systems: body.systems.length },
    })
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: e.flatten() })
      return
    }
    next(e)
  }
})

export { router as obligationsRouter }
