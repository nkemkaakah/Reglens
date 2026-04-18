import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ControlDrawer } from '../components/ControlDrawer'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { apiFetchJson, CATALOG_API_BASE_URL } from '../lib/apiClient'
import type { ControlCatalogRow, ControlLifecycleStatus, Page } from '../types/api'

type Filters = {
  category: string
  status: ControlLifecycleStatus | ''
  q: string
}

function toneForControlStatus(
  status: ControlCatalogRow['status'],
): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'UNDER_REVIEW':
      return 'warning'
    case 'DEPRECATED':
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

/** Feature 3 — control library list + detail drawer (create/edit modals deferred per PRD). */
export function ControlsPage() {
  const [filters, setFilters] = useState<Filters>({
    category: '',
    status: '',
    q: '',
  })
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'ref,asc')
    if (filters.category.trim()) params.set('category', filters.category.trim())
    if (filters.status) params.set('status', filters.status)
    if (filters.q.trim()) params.set('q', filters.q.trim())
    return params.toString()
  }, [filters, page, size])

  const controlsQuery = useQuery({
    queryKey: ['catalog', 'controls', queryParams],
    queryFn: async () => {
      const path = `/controls?${queryParams}`
      console.log('[RegLens] catalog:controls:list', { path })
      const data = await apiFetchJson<Page<ControlCatalogRow>>(CATALOG_API_BASE_URL, path)
      console.log('[RegLens] catalog:controls:list:ok', {
        totalElements: data.totalElements,
        returned: data.content.length,
      })
      return data
    },
  })

  const content = controlsQuery.data?.content ?? []

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Feature 3" tone="info" />
          <StatusBadge label="Controls" tone="success" />
          <StatusBadge label="Read-only UI" tone="warning" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Controls catalogue</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Risk and compliance control library — mapping targets for obligations in later phases.
        </p>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium text-app-muted">Search</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="Ref, title, or description"
              value={filters.q}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, q: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Category</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="e.g. Model Risk"
              value={filters.category}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, category: e.target.value }))
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
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </label>
        </div>
      </div>

      {controlsQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
            <div className="h-4 w-3/4 rounded bg-app-subtle" />
          </div>
        </div>
      ) : controlsQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load controls from the catalogue API ({CATALOG_API_BASE_URL}).
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer bg-app-surface hover:bg-app-subtle"
                    onClick={() => setSelectedControlId(row.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted">{row.ref}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold">{row.title}</p>
                      <p className="mt-1 line-clamp-2 max-w-xl text-sm text-app-muted">
                        {row.description}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{row.category}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge
                        label={row.status.replaceAll('_', ' ')}
                        tone={toneForControlStatus(row.status)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{row.ownerTeam?.name ?? '—'}</p>
                      <p className="mt-1 text-xs text-app-muted">{row.ownerTeam?.domain ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-app-muted">{formatDate(row.createdAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(controlsQuery.data?.number ?? 0) + 1} of {controlsQuery.data?.totalPages ?? 1} ·{' '}
              {controlsQuery.data?.totalElements ?? content.length} total
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
                disabled={Boolean(controlsQuery.data?.last)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No controls found"
          description="Adjust filters or ensure catalog-service is running with seed data."
        />
      )}

      {selectedControlId ? (
        <ControlDrawer controlId={selectedControlId} onClose={() => setSelectedControlId(null)} />
      ) : null}
    </section>
  )
}
