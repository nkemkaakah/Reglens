import { getAuthHeaders } from './auth'

/** Single origin for browser calls; each backend is mounted under a path segment (see api-gateway). */
const apiGatewayBase =
  import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:8090'

export const OBLIGATION_API_BASE_URL =
  import.meta.env.VITE_OBLIGATION_API_URL ?? `${apiGatewayBase}/obligation`

export const INGESTION_API_BASE_URL =
  import.meta.env.VITE_INGESTION_API_URL ?? `${apiGatewayBase}/ingestion`

export const CATALOG_API_BASE_URL =
  import.meta.env.VITE_CATALOG_API_URL ?? `${apiGatewayBase}/catalog`

export const MAPPING_API_BASE_URL =
  import.meta.env.VITE_MAPPING_API_URL ?? `${apiGatewayBase}/mapping`

export const IMPACT_API_BASE_URL =
  import.meta.env.VITE_IMPACT_API_URL ?? `${apiGatewayBase}/impact`

export const AI_REGISTRY_API_BASE_URL =
  import.meta.env.VITE_AI_REGISTRY_API_URL ?? `${apiGatewayBase}/ai-registry`

export const WORKFLOW_API_BASE_URL =
  import.meta.env.VITE_WORKFLOW_API_URL ?? `${apiGatewayBase}/workflow`

type ApiError = Error & { status?: number; body?: string }

async function parseError(response: Response): Promise<ApiError> {
  const error: ApiError = new Error(
    `API request failed (${response.status}) for ${response.url}`,
  )
  error.status = response.status
  try {
    error.body = await response.text()
  } catch {
    // ignore
  }
  return error
}

export async function apiFetchJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`
  const started = performance.now()
  console.log('[RegLens] fetch', init.method ?? 'GET', url)
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers ?? {}),
    },
  })

  const elapsedMs = Math.round(performance.now() - started)
  if (!response.ok) {
    console.warn('[RegLens] fetch failed', response.status, url, `${elapsedMs}ms`)
    throw await parseError(response)
  }

  console.log('[RegLens] fetch ok', response.status, url, `${elapsedMs}ms`)
  return (await response.json()) as T
}

export async function apiUploadForm<T>(
  baseUrl: string,
  path: string,
  form: FormData,
  init: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`
  const started = performance.now()
  console.log('[RegLens] upload', init.method ?? 'POST', url)
  const response = await fetch(url, {
    ...init,
    method: init.method ?? 'POST',
    body: form,
    headers: {
      ...(init.headers ?? {}),
    },
  })

  const elapsedMs = Math.round(performance.now() - started)
  if (!response.ok) {
    console.warn('[RegLens] upload failed', response.status, url, `${elapsedMs}ms`)
    throw await parseError(response)
  }

  console.log('[RegLens] upload ok', response.status, url, `${elapsedMs}ms`)
  return (await response.json()) as T
}
