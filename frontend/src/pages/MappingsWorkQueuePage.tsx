import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useRole } from '../hooks/useRole'
import { StatusBadge } from '../components/StatusBadge'
import { apiFetchJson, OBLIGATION_API_BASE_URL } from '../lib/apiClient'
import type { ObligationStatus, Page, RiskRating, ObligationSummary } from '../types/api'

const MAPPING_ATTENTION_STATUSES = 'UNMAPPED,IN_PROGRESS' as const

type Filters = {
  riskRating: RiskRating | ''
  regulator: string
  topic: string
  q: string
}

function toneForStatus(status: ObligationSummary['status']): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (status) {
    case 'UNMAPPED':
      return 'warning'
    case 'IN_PROGRESS':
      return 'warning'
    case 'MAPPED':
      return 'success'
    case 'IMPLEMENTED':
      return 'success'
    default:
      return 'info'
  }
}

function toneForRisk(risk: ObligationSummary['riskRating']): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (risk) {
    case 'LOW':
      return 'success'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
      return 'risk'
    case 'CRITICAL':
      return 'risk'
    default:
      return 'info'
  }
}

export function MappingsWorkQueuePage() {
  const navigate = useNavigate()
  const { canIngest } = useRole()
  const [filters, setFilters] = useState<Filters>({
    riskRating: '',
    regulator: '',
    topic: '',
    q: '',
  })
  const [page, setPage] = useState(0)
  const [size] = useState(20)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'createdAt,desc')
    params.set('statusIn', MAPPING_ATTENTION_STATUSES)
    if (filters.riskRating) params.set('riskRating', filters.riskRating)
    if (filters.regulator.trim()) params.set('regulator', filters.regulator.trim())
    if (filters.topic.trim()) params.set('topic', filters.topic.trim())
    if (filters.q.trim()) params.set('q', filters.q.trim())
    return params.toString()
  }, [filters, page, size])

  const obligationsQuery = useQuery({
    queryKey: ['obligations', 'mapping-queue', queryParams],
    queryFn: () =>
      apiFetchJson<Page<ObligationSummary>>(OBLIGATION_API_BASE_URL, `/obligations?${queryParams}`),
  })

  const content = obligationsQuery.data?.content ?? []

  const openInExplorer = (obligationId: string) => {
    const q = new URLSearchParams()
    q.set('obligation', obligationId)
    q.set('panel', 'mappings')
    navigate(`/obligations?${q.toString()}`)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h2 className="text-2xl font-semibold tracking-tight">AI-assisted mappings</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Prioritise obligations that are still <strong className="text-app-text">Unmapped</strong> or{' '}
          <strong className="text-app-text">In progress</strong>. Open a row to review AI-suggested controls
          and systems, approve what applies, and send the obligation forward for impact analysis.
        </p>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium text-app-muted">Search</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="Search title or summary"
              value={filters.q}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, q: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Risk</span>
            <select
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              value={filters.riskRating}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, riskRating: e.target.value as Filters['riskRating'] }))
              }}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Regulator</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="FCA / PRA / BOE"
              value={filters.regulator}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, regulator: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Topic</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="AI Governance"
              value={filters.topic}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, topic: e.target.value }))
              }}
            />
          </label>
        </div>
        {!canIngest ? (
          <p className="mt-3 text-xs text-app-muted">
            You can review queue items, but only Compliance Officers can run suggestions and approvals.
          </p>
        ) : null}
      </div>

      {obligationsQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
          </div>
        </div>
      ) : obligationsQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load this queue. Check your connection and try again.
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3 w-[1%] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((ob) => (
                  <tr key={ob.id} className="bg-app-surface hover:bg-app-subtle">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted">{ob.ref}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold [overflow-wrap:anywhere]">{ob.title}</p>
                      <p className="mt-1 max-w-xl text-sm text-app-muted [overflow-wrap:anywhere]">
                        {ob.summary}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge
                        label={(ob.status as ObligationStatus).replace('_', ' ')}
                        tone={toneForStatus(ob.status)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ob.riskRating ? (
                        <StatusBadge label={ob.riskRating} tone={toneForRisk(ob.riskRating)} />
                      ) : (
                        <span className="text-sm text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        className="rounded-md bg-brand px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-hover"
                        onClick={() => openInExplorer(ob.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(obligationsQuery.data?.number ?? 0) + 1} of {obligationsQuery.data?.totalPages ?? 1} ·{' '}
              {obligationsQuery.data?.totalElements ?? content.length} in queue
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
                disabled={Boolean(obligationsQuery.data?.last)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No obligations in this queue"
          description="Nothing matches your criteria right now. Broaden your search or ingest new regulatory documents to add obligations."
        />
      )}
    </section>
  )
}
