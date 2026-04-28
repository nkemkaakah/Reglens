import { useQuery } from '@tanstack/react-query'
import {
  apiFetchJson,
  OBLIGATION_API_BASE_URL,
  WORKFLOW_API_BASE_URL,
} from '../lib/apiClient'
import type { ObligationSummary, Page, WorkflowEventRow } from '../types/api'

type EventTimelineProps = {
  queryKey: readonly unknown[]
  fetchPath: string
  emptyLabel?: string
  pagination?: {
    onPageChange: (page: number) => void
  }
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

export function EventTimeline({ queryKey, fetchPath, emptyLabel, pagination }: EventTimelineProps) {
  const eventsQuery = useQuery({
    queryKey,
    queryFn: async () =>
      apiFetchJson<Page<WorkflowEventRow>>(WORKFLOW_API_BASE_URL, fetchPath),
  })
  const obligationIds = Array.from(
    new Set((eventsQuery.data?.content ?? []).map((e) => e.obligationId).filter(Boolean) as string[]),
  )
  const obligationsByIdQuery = useQuery({
    queryKey: ['workflow', 'obligation-context', ...obligationIds],
    enabled: obligationIds.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        obligationIds.map(async (id) => {
          try {
            const row = await apiFetchJson<ObligationSummary>(OBLIGATION_API_BASE_URL, `/obligations/${id}`)
            return [id, row] as const
          } catch {
            return [id, null] as const
          }
        }),
      )
      return Object.fromEntries(rows) as Record<string, ObligationSummary | null>
    },
  })

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-app-muted">Loading activity…</p>
  }
  if (eventsQuery.isError) {
    return (
      <p className="text-sm text-status-risk">
        Could not load workflow events. Ensure workflow-service is running and the API gateway (
        <span className="font-mono text-xs">VITE_API_GATEWAY_URL</span>, default{' '}
        <span className="font-mono text-xs">http://localhost:8090</span>) can reach{' '}
        <span className="font-mono text-xs">/workflow</span>.
      </p>
    )
  }

  const pageData = eventsQuery.data
  const rows = pageData?.content ?? []
  const obligationsById = obligationsByIdQuery.data ?? {}

  if (pageData && pageData.totalElements === 0) {
    return (
      <p className="text-sm text-app-muted">
        {emptyLabel ?? 'No workflow events recorded yet.'}
      </p>
    )
  }

  const showPager =
    pagination != null &&
    pageData != null &&
    pageData.totalPages > 0 &&
    (pageData.totalPages > 1 || pageData.number > 0)

  const listBlock =
    rows.length === 0 ? (
      <p className="mt-4 text-sm text-app-muted">No events on this page.</p>
    ) : (
      <ul className="mt-4 space-y-4">
        {rows.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-app-border bg-app-subtle px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-xs text-app-muted">{e.type}</p>
              <p className="text-xs text-app-muted">{formatWhen(e.occurredAt)}</p>
            </div>
            <p className="mt-2 leading-relaxed text-app-text">{e.summary ?? '—'}</p>
            {(() => {
              if (!e.obligationId) return null
              const obligation = obligationsById[e.obligationId]
              const ref = e.obligationRef ?? obligation?.ref
              const title = e.obligationTitle ?? obligation?.title
              if (!ref && !title) {
                return (
                  <p className="mt-1 text-xs text-app-muted">
                    Obligation: <span className="font-mono">{e.obligationId}</span>
                  </p>
                )
              }
              return (
                <p className="mt-1 text-xs text-app-muted">
                  {ref ? <span className="font-mono">{ref}</span> : null}
                  {ref && title ? ' — ' : null}
                  {title ? <span className="text-app-text">{title}</span> : null}
                </p>
              )
            })()}
            {e.actor ? (
              <p className="mt-1 text-xs text-app-muted">
                Actor: <span className="font-medium text-app-text">{e.actor}</span>
              </p>
            ) : null}
            {e.documentId ? (
              <p className="mt-1 text-xs text-app-muted">
                Document: <span className="font-mono">{e.documentId}</span>
              </p>
            ) : null}
            {e.obligationIds && e.obligationIds.length > 0 ? (
              <p className="mt-1 text-xs text-app-muted">
                Obligations in ingest:{' '}
                <span className="font-mono">{e.obligationIds.length}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    )

  return (
    <div>
      {listBlock}
      {showPager && pageData ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4 text-xs text-app-muted">
          <p>
            Page <span className="font-medium text-app-text">{pageData.number + 1}</span> of{' '}
            <span className="font-medium text-app-text">{pageData.totalPages}</span>
            <span className="text-app-muted"> · </span>
            {pageData.totalElements} event{pageData.totalElements === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-app-border px-3 py-1.5 text-app-text hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pageData.number <= 0}
              onClick={() => pagination?.onPageChange(pageData.number - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-app-border px-3 py-1.5 text-app-text hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pageData.last}
              onClick={() => pagination?.onPageChange(pageData.number + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
