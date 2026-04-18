import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CatalogSystemDrawer } from '../components/CatalogSystemDrawer'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { apiFetchJson, CATALOG_API_BASE_URL } from '../lib/apiClient'
import type { CatalogSystemRow, Criticality, Page } from '../types/api'

type Filters = {
  domain: string
  criticality: Criticality | ''
  q: string
}

function toneForCriticality(
  c: Criticality,
): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (c) {
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

/** Feature 3 — internal systems catalogue list + detail drawer. */
export function SystemsPage() {
  const [filters, setFilters] = useState<Filters>({
    domain: '',
    criticality: '',
    q: '',
  })
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'ref,asc')
    if (filters.domain.trim()) params.set('domain', filters.domain.trim())
    if (filters.criticality) params.set('criticality', filters.criticality)
    if (filters.q.trim()) params.set('q', filters.q.trim())
    return params.toString()
  }, [filters, page, size])

  const systemsQuery = useQuery({
    queryKey: ['catalog', 'systems', queryParams],
    queryFn: async () => {
      const path = `/systems?${queryParams}`
      console.log('[RegLens] catalog:systems:list', { path })
      const data = await apiFetchJson<Page<CatalogSystemRow>>(CATALOG_API_BASE_URL, path)
      console.log('[RegLens] catalog:systems:list:ok', {
        totalElements: data.totalElements,
        returned: data.content.length,
      })
      return data
    },
  })

  const content = systemsQuery.data?.content ?? []

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Feature 3" tone="info" />
          <StatusBadge label="Systems" tone="success" />
          <StatusBadge label="Read-only UI" tone="warning" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Systems catalogue</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Internal applications and services — metadata for architects and for obligation→system mapping later.
        </p>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium text-app-muted">Search</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="Ref, name, or description"
              value={filters.q}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, q: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Domain</span>
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              placeholder="e.g. Credit"
              value={filters.domain}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, domain: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-app-muted">Criticality</span>
            <select
              className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              value={filters.criticality}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, criticality: e.target.value as Filters['criticality'] }))
              }}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
        </div>
      </div>

      {systemsQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
            <div className="h-4 w-3/4 rounded bg-app-subtle" />
          </div>
        </div>
      ) : systemsQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load systems from the catalogue API ({CATALOG_API_BASE_URL}).
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Tech</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer bg-app-surface hover:bg-app-subtle"
                    onClick={() => setSelectedSystemId(row.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted">{row.ref}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold">{row.displayName}</p>
                      <p className="mt-1 line-clamp-2 max-w-xl text-sm text-app-muted">
                        {row.description ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{row.domain ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge label={row.criticality} tone={toneForCriticality(row.criticality)} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{row.ownerTeam?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-app-muted">
                        {row.techStack.length
                          ? row.techStack.slice(0, 2).join(' · ') +
                            (row.techStack.length > 2 ? ` +${row.techStack.length - 2}` : '')
                          : '—'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(systemsQuery.data?.number ?? 0) + 1} of {systemsQuery.data?.totalPages ?? 1} ·{' '}
              {systemsQuery.data?.totalElements ?? content.length} total
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
                disabled={Boolean(systemsQuery.data?.last)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No systems found"
          description="Adjust filters or ensure catalog-service is running with seed data."
        />
      )}

      {selectedSystemId ? (
        <CatalogSystemDrawer systemId={selectedSystemId} onClose={() => setSelectedSystemId(null)} />
      ) : null}
    </section>
  )
}
