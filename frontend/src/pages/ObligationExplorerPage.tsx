import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ObligationDrawer, type ObligationDrawerPanel } from '../components/ObligationDrawer'
import { StatusBadge } from '../components/StatusBadge'
import { apiFetchJson, OBLIGATION_API_BASE_URL } from '../lib/apiClient'
import type { ObligationStatus, Page, RiskRating, ObligationSummary } from '../types/api'

const OBLIGATION_ID_PARAM = 'obligation'
const PANEL_PARAM = 'panel'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Filters = {
  status: ObligationStatus | ''
  riskRating: RiskRating | ''
  regulator: string
  topic: string
  aiPrinciple: string
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString()
}

function parsePanel(value: string): ObligationDrawerPanel | undefined {
  const v = value.trim().toLowerCase()
  if (v === 'mappings' || v === 'impact') return v
  return undefined
}

export function ObligationExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const obligationFromUrl = searchParams.get(OBLIGATION_ID_PARAM)?.trim() ?? ''
  const panelFromUrl = searchParams.get(PANEL_PARAM)?.trim() ?? ''
  const initialDrawerPanel = parsePanel(panelFromUrl)

  const [filters, setFilters] = useState<Filters>({
    status: '',
    riskRating: '',
    regulator: '',
    topic: '',
    aiPrinciple: '',
    q: '',
  })
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const selectedId =
    obligationFromUrl && UUID_RE.test(obligationFromUrl) ? obligationFromUrl : null

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'createdAt,desc')
    if (filters.status) params.set('status', filters.status)
    if (filters.riskRating) params.set('riskRating', filters.riskRating)
    if (filters.regulator.trim()) params.set('regulator', filters.regulator.trim())
    if (filters.topic.trim()) params.set('topic', filters.topic.trim())
    if (filters.aiPrinciple.trim()) params.set('aiPrinciple', filters.aiPrinciple.trim())
    if (filters.q.trim()) params.set('q', filters.q.trim())
    return params.toString()
  }, [filters, page, size])

  const obligationsQuery = useQuery({
    queryKey: ['obligations', queryParams],
    queryFn: async () => {
      const path = `/obligations?${queryParams}`
      return apiFetchJson<Page<ObligationSummary>>(OBLIGATION_API_BASE_URL, path)
    },
  })

  const content = obligationsQuery.data?.content ?? []

  const syncExplorerUrl = (obligationId: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!obligationId) {
          next.delete(OBLIGATION_ID_PARAM)
          next.delete(PANEL_PARAM)
        } else {
          next.set(OBLIGATION_ID_PARAM, obligationId)
          next.delete(PANEL_PARAM)
        }
        return next
      },
      { replace: true },
    )
  }

  const openObligationRow = (id: string) => {
    syncExplorerUrl(id)
  }

  const closeDrawer = () => {
    syncExplorerUrl(null)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Obligation Explorer</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Browse and triage regulatory obligations extracted from FCA, PRA and BoE documents. Open any row to
          review the full obligation record, AI mapping suggestions, and impact analysis in context.
        </p>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
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
            <span className="text-xs font-medium text-app-muted">Status</span>
            <select
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              value={filters.status}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, status: e.target.value as Filters['status'] }))
              }}
            >
              <option value="">All</option>
              <option value="UNMAPPED">Unmapped</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="MAPPED">Mapped</option>
              <option value="IMPLEMENTED">Implemented</option>
            </select>
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
          <label className="block">
            <span className="text-xs font-medium text-app-muted">AI principle</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="Transparency"
              value={filters.aiPrinciple}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, aiPrinciple: e.target.value }))
              }}
            />
          </label>
        </div>
      </div>

      {obligationsQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
            <div className="h-4 w-3/4 rounded bg-app-subtle" />
          </div>
        </div>
      ) : obligationsQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load obligations. Check your connection and try again.
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Regulator</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((ob) => (
                  <tr
                    key={ob.id}
                    className={`cursor-pointer bg-app-surface hover:bg-app-subtle ${
                      selectedId === ob.id ? 'bg-brand-muted/40' : ''
                    }`}
                    onClick={() => openObligationRow(ob.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted">{ob.ref}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold">{ob.title}</p>
                      <p className="mt-1 max-w-2xl text-sm text-app-muted">
                        {ob.summary}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{ob.regulator}</p>
                      <p className="mt-1 text-xs font-mono text-app-muted">
                        {ob.documentRef}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge
                        label={ob.status.replace('_', ' ')}
                        tone={toneForStatus(ob.status)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ob.riskRating ? (
                        <StatusBadge
                          label={ob.riskRating}
                          tone={toneForRisk(ob.riskRating)}
                        />
                      ) : (
                        <span className="text-sm text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-app-muted">
                        {formatDate(ob.createdAt)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(obligationsQuery.data?.number ?? 0) + 1} of{' '}
              {obligationsQuery.data?.totalPages ?? 1} ·{' '}
              {obligationsQuery.data?.totalElements ?? content.length} total
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
          title="No obligations found"
          description="Ingest a regulatory document first, or broaden your search and criteria."
        />
      )}

      {selectedId ? (
        <ObligationDrawer
          obligationId={selectedId}
          onClose={closeDrawer}
          initialPanel={initialDrawerPanel}
        />
      ) : null}
    </section>
  )
}
