import { useQuery } from '@tanstack/react-query'
import {
  apiFetchJson,
  OBLIGATION_API_BASE_URL,
  WORKFLOW_API_BASE_URL,
} from '../lib/apiClient'
import type { ObligationSummary, Page, WorkflowEventRow } from '../types/api'

type EventTimelineProps = {
  queryKey: readonly unknown[]
  /** Path only, e.g. `/obligations/{id}/events?size=50` */
  fetchPath: string
  emptyLabel?: string
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

export function EventTimeline({ queryKey, fetchPath, emptyLabel }: EventTimelineProps) {
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
        Could not load workflow events. Ensure workflow-service is running and{' '}
        <span className="font-mono text-xs">VITE_WORKFLOW_API_URL</span> points to it.
      </p>
    )
  }

  const rows = eventsQuery.data?.content ?? []
  const obligationsById = obligationsByIdQuery.data ?? {}
  if (rows.length === 0) {
    return (
      <p className="text-sm text-app-muted">
        {emptyLabel ?? 'No workflow events recorded yet.'}
      </p>
    )
  }

  return (
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
}
