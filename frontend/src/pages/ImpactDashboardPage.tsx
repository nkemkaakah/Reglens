import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
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
        <h2 className="text-2xl font-semibold tracking-tight">Impact analyses</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Track the engineering and compliance impact of every mapped obligation in one place. Click any row
          to see the full impact summary, compliance gap, and suggested tasks.
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
          Could not load impact analyses. Check your connection and try again.
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3 w-[22%]">Obligation</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 w-[1%] whitespace-nowrap">Generated</th>
                  <th className="px-4 py-3 w-[1%] whitespace-nowrap">View</th>
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
              {impactsQuery.data?.totalElements ?? content.length} analyses
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
          description="Analyses appear after obligations are mapped to controls and systems and impact generation has completed. Approve mappings on each obligation first, then return here."
        />
      )}
    </section>
  )
}
