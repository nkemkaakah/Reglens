import { config } from '../config.js'
import { HttpError } from '../httpError.js'
import { log } from '../log.js'
import type { SpringPage } from '../types/springPage.js'
import type { ControlSummary, SystemSummary } from '../types/upstream.js'

/** Raw control row from catalog API — we only forward a compact subset to the LLM. */
type ControlResponseRaw = {
  id: string
  ref: string
  category: string
  title: string
  description: string
}

type SystemResponseRaw = {
  id: string
  ref: string
  displayName: string
  domain: string | null
  description: string | null
}

async function fetchPage<T>(
  path: string,
  searchParams: URLSearchParams,
  authorizationHeader: string,
): Promise<SpringPage<T>> {
  const base = config.catalogServiceBaseUrl.replace(/\/$/, '')
  const url = `${base}${path}?${searchParams.toString()}`
  const ctrl = AbortSignal.timeout(config.upstreamTimeoutMs)
  const res = await fetch(url, {
    signal: ctrl,
    headers: { Authorization: authorizationHeader },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    log.warn('catalog-service error', { url, status: res.status, bodySnippet: body.slice(0, 300) })
    throw new HttpError(res.status, `catalog-service returned ${res.status} for ${path}`)
  }
  return (await res.json()) as SpringPage<T>
}

/**
 * Walks all pages of GET /controls — bounded by {@code catalogMaxPages} so a misconfigured cluster
 * cannot loop forever.
 */
export async function fetchAllControls(authorizationHeader: string): Promise<ControlSummary[]> {
  const out: ControlSummary[] = []
  for (let page = 0; page < config.catalogMaxPages; page++) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(config.catalogPageSize),
    })
    const pageData = await fetchPage<ControlResponseRaw>('/controls', params, authorizationHeader)
    for (const row of pageData.content) {
      out.push({
        id: row.id,
        ref: row.ref,
        category: row.category,
        title: row.title,
        description: row.description,
      })
    }
    log.info('catalog controls page fetched', { page, batch: pageData.content.length, total: out.length })
    if (pageData.content.length === 0) break
    if (page >= (pageData.totalPages ?? 1) - 1) break
  }
  return out
}

/** Walks all pages of GET /systems (same pagination contract as controls). */
export async function fetchAllSystems(authorizationHeader: string): Promise<SystemSummary[]> {
  const out: SystemSummary[] = []
  for (let page = 0; page < config.catalogMaxPages; page++) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(config.catalogPageSize),
    })
    const pageData = await fetchPage<SystemResponseRaw>('/systems', params, authorizationHeader)
    for (const row of pageData.content) {
      out.push({
        id: row.id,
        ref: row.ref,
        displayName: row.displayName,
        domain: row.domain,
        description: row.description,
      })
    }
    log.info('catalog systems page fetched', { page, batch: pageData.content.length, total: out.length })
    if (pageData.content.length === 0) break
    if (page >= (pageData.totalPages ?? 1) - 1) break
  }
  return out
}
