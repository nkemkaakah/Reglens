import type { AiSystemDetail, AiSystemWriteBody } from '../types/api'

const RISK_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const STATUS_OPTIONS = ['PROPOSED', 'IN_REVIEW', 'LIVE', 'DECOMMISSIONED'] as const
const AI_TYPES = ['ML', 'LLM', 'GENAI', 'RULE_BASED', 'HYBRID'] as const

export function statusSelectValue(status: string | null | undefined): string {
  if (status && (STATUS_OPTIONS as readonly string[]).includes(status)) return status
  return 'PROPOSED'
}

export function aiTypeSelectValue(aiType: string | null | undefined): string {
  if (aiType && (AI_TYPES as readonly string[]).includes(aiType)) return aiType
  return 'LLM'
}

export function parseDataSources(raw: string): string[] | null {
  const lines = raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
  return lines.length ? lines : null
}

export function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t ? t : null
}

/** `yyyy-MM-dd` for `<input type="date">` from API date / ISO string. */
export function dateInputFromApi(value: string | null | undefined): string {
  if (!value) return ''
  const s = value.trim()
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function riskSelectValue(risk: string | null | undefined): string {
  if (risk && (RISK_OPTIONS as readonly string[]).includes(risk)) return risk
  return 'MEDIUM'
}

/** Map GET detail into register/edit form field state. */
export function aiSystemDetailToFormFields(detail: AiSystemDetail) {
  return {
    formRef: detail.ref,
    formName: detail.name,
    formDescription: detail.description ?? '',
    formAiType: aiTypeSelectValue(detail.aiType),
    formUseCase: detail.useCase,
    formDomain: detail.businessDomain ?? '',
    formModelProvider: detail.modelProvider ?? '',
    formModelName: detail.modelName ?? '',
    formDataSources: detail.dataSources?.join('\n') ?? '',
    formOwnerTeamId: detail.ownerTeamId,
    formTechLead: detail.techLeadEmail ?? '',
    formRisk: riskSelectValue(detail.riskRating),
    formDeployedAt: dateInputFromApi(detail.deployedAt),
    formLastReviewed: dateInputFromApi(detail.lastReviewed),
    formStatus: statusSelectValue(detail.status),
  }
}

export type AiSystemFormFieldState = ReturnType<typeof aiSystemDetailToFormFields>

export function buildAiSystemWriteBody(fields: AiSystemFormFieldState): AiSystemWriteBody {
  const ref = fields.formRef.trim()
  const name = fields.formName.trim()
  const useCase = fields.formUseCase.trim()
  return {
    ref,
    name,
    description: emptyToNull(fields.formDescription),
    aiType: fields.formAiType,
    useCase,
    businessDomain: emptyToNull(fields.formDomain),
    modelProvider: emptyToNull(fields.formModelProvider),
    modelName: emptyToNull(fields.formModelName),
    dataSources: parseDataSources(fields.formDataSources),
    ownerTeamId: fields.formOwnerTeamId.trim(),
    techLeadEmail: emptyToNull(fields.formTechLead),
    riskRating: fields.formRisk.trim() || null,
    deployedAt: fields.formDeployedAt.trim() || null,
    lastReviewed: fields.formLastReviewed.trim() || null,
    status: fields.formStatus,
  }
}
