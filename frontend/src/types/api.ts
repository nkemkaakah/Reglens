export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
}

export type ObligationStatus = 'UNMAPPED' | 'IN_PROGRESS' | 'MAPPED' | 'IMPLEMENTED'
export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ObligationSummary {
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
  riskRating: RiskRating | null
  effectiveDate: string | null
  status: ObligationStatus
  triagedBy: string | null
  triagedAt: string | null
  createdAt: string
}

export interface DocumentResponse {
  id: string
  ref: string
  title: string
  regulator: string
  docType: string | null
  url: string | null
  publishedDate: string | null
  effectiveDate: string | null
  status: string
  topics: string[] | null
  ingestedAt: string
  ingestedBy: string
}

export interface IngestResponse {
  document: DocumentResponse
  obligations: ObligationSummary[]
  obligationCount: number
}

/** Feature 3 — catalogue owner team (matches catalog-service JSON). */
export interface TeamSummary {
  id: string
  name: string
  domain: string
}

export type ControlLifecycleStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'DEPRECATED'
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ControlLinkedSystemRow {
  systemId: string
  ref: string
  displayName: string
  notes: string | null
}

export interface SystemLinkedControlRow {
  controlId: string
  ref: string
  title: string
  category: string
  notes: string | null
}

/** Control library row (list or detail — list has empty linkedSystems). */
export interface ControlCatalogRow {
  id: string
  ref: string
  category: string
  title: string
  description: string
  evidenceType: string | null
  reviewFrequency: string | null
  status: ControlLifecycleStatus
  ownerTeam: TeamSummary | null
  createdAt: string
  linkedSystems: ControlLinkedSystemRow[]
}

/** Internal system catalogue row (list or detail). */
export interface CatalogSystemRow {
  id: string
  ref: string
  displayName: string
  description: string | null
  domain: string | null
  techStack: string[]
  repoUrl: string | null
  criticality: Criticality
  ownerTeam: TeamSummary | null
  createdAt: string
  linkedControls: SystemLinkedControlRow[]
}

