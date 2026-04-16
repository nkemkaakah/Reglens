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

