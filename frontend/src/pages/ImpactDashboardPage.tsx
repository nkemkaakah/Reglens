import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { apiFetchJson, IMPACT_API_BASE_URL } from '../lib/apiClient'
import type { ImpactIndexSummary, Page } from '../types/api'

function formatWhen(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

function truncateSummary(text: string, max = 200): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * Cross-obligation impact inventory: list rows from impact-service GET /impacts (id + summary only).
 * Drill-in opens the obligation explorer drawer on the impact section for full detail.
 */
export function ImpactDashboardPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [size] = useState(20)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'createdAt,desc')
    return params.toString()
  }, [page, size])

  const impactsQuery = useQuery({
    queryKey: ['impacts', 'dashboard', queryParams],
    queryFn: () =>
      apiFetchJson<Page<ImpactIndexSummary>>(IMPACT_API_BASE_URL, `/impacts?${queryParams}`),
  })

  const content = impactsQuery.data?.content ?? []

  const openInExplorer = (obligationId: string) => {
    const q = new URLSearchParams()
    q.set('obligation', obligationId)
    q.set('panel', 'impact')
    navigate(`/obligations?${q.toString()}`)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Feature 5" tone="info" />
          <StatusBadge label="Cross-obligation" tone="warning" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Impact analyses — dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Every obligation that already has a generated impact record. Open a row to see full obligation
          context and the complete impact breakdown in the drawer.
        </p>
      </div>

      {impactsQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
          </div>
        </div>
      ) : impactsQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load impact list. Ensure impact-service is running and has generated at least one
          analysis.
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3 w-[22%]">Obligation id</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 w-[1%] whitespace-nowrap">Generated</th>
                  <th className="px-4 py-3 w-[1%] whitespace-nowrap">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((row) => (
                  <tr key={row.obligationId} className="bg-app-surface hover:bg-app-subtle">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted [overflow-wrap:anywhere]">{row.obligationId}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                        {truncateSummary(row.summary)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-app-muted whitespace-nowrap">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        className="rounded-md bg-brand px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-hover"
                        onClick={() => openInExplorer(row.obligationId)}
                      >
                        View detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(impactsQuery.data?.number ?? 0) + 1} of {impactsQuery.data?.totalPages ?? 1} ·{' '}
              {impactsQuery.data?.totalElements ?? content.length} with impact
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-app-border px-3 py-2 text-sm text-app-muted hover:bg-app-subtle hover:text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-md border border-app-border px-3 py-2 text-sm text-app-muted hover:bg-app-subtle hover:text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(impactsQuery.data?.last)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No impact analyses yet"
          description="Impact rows appear after the pipeline generates them for mapped obligations. Use the obligation drawer or wait for async generation."
        />
      )}
    </section>
  )
}
