/** Obligation detail — mirrors obligation-service {@code ObligationResponse} JSON field names. */
export type ObligationDetail = {
  id: string
  documentId: string
  documentRef: string
  documentTitle: string
  regulator: string
  ref: string
  title: string
  summary: string
  fullText: string
  sectionRef: string | null
  topics: string[] | null
  aiPrinciples: string[] | null
  riskRating: string | null
  effectiveDate: string | null
  status: string
  triagedBy: string | null
  triagedAt: string | null
  createdAt: string
}

/** Control row from catalog-service (subset used for LLM + validation). */
export type ControlSummary = {
  id: string
  ref: string
  category: string
  title: string
  description: string
}

/** System row from catalog-service. */
export type SystemSummary = {
  id: string
  ref: string
  displayName: string
  domain: string | null
  description: string | null
}
