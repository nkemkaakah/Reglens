import { config } from '../config.js'
import { HttpError } from '../httpError.js'
import { log } from '../log.js'
import type { ObligationDetail } from '../types/upstream.js'

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${config.obligationServiceToken}`,
    'Content-Type': 'application/json',
  }
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${config.obligationServiceBaseUrl.replace(/\/$/, '')}${path}`
  const ctrl = AbortSignal.timeout(config.upstreamTimeoutMs)
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...init.headers }, signal: ctrl })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    log.warn('obligation-service error', { url, status: res.status, bodySnippet: body.slice(0, 500) })
    throw new HttpError(res.status, `obligation-service returned ${res.status} for ${path}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

/** Full obligation payload for suggest-mappings (Feature 4). */
export async function getObligation(obligationId: string): Promise<ObligationDetail> {
  return fetchJson<ObligationDetail>(`/obligations/${obligationId}`)
}

export type ControlMappingPayload = {
  controlId: string
  confidence?: number | null
  explanation?: string | null
  source?: string | null
  approvedBy: string
}

export type SystemMappingPayload = {
  systemId: string
  confidence?: number | null
  explanation?: string | null
  source?: string | null
  approvedBy: string
}

/**
 * Persists approved control mappings — delegates to obligation-service (single source of truth).
 */
export async function postControlMappings(
  obligationId: string,
  rows: ControlMappingPayload[],
): Promise<unknown> {
  if (rows.length === 0) return []
  const path = `/obligations/${obligationId}/mappings/controls`
  log.info('POST obligation mappings/controls', { obligationId, count: rows.length })
  return fetchJson(path, { method: 'POST', body: JSON.stringify(rows) })
}

export async function postSystemMappings(
  obligationId: string,
  rows: SystemMappingPayload[],
): Promise<unknown> {
  if (rows.length === 0) return []
  const path = `/obligations/${obligationId}/mappings/systems`
  log.info('POST obligation mappings/systems', { obligationId, count: rows.length })
  return fetchJson(path, { method: 'POST', body: JSON.stringify(rows) })
}

export type MappingRejectionPayload = {
  catalogueKind: 'control' | 'system'
  catalogueId: string
  rejectedBy: string
  reason?: string | null
}

export type MappingRejectionRow = {
  id: string
  catalogueKind: string
  catalogueId: string
  rejectedBy: string
  reason: string | null
  rejectedAt: string
}

export async function postMappingRejection(
  obligationId: string,
  body: MappingRejectionPayload,
): Promise<MappingRejectionRow> {
  const path = `/obligations/${obligationId}/mapping-rejections`
  log.info('POST obligation mapping-rejection', { obligationId, catalogueKind: body.catalogueKind })
  return fetchJson<MappingRejectionRow>(path, { method: 'POST', body: JSON.stringify(body) })
}
