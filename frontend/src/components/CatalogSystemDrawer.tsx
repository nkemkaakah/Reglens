import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from './StatusBadge'
import { apiFetchJson, CATALOG_API_BASE_URL } from '../lib/apiClient'
import type { CatalogSystemRow, Criticality } from '../types/api'

type CatalogSystemDrawerProps = {
  systemId: string
  onClose: () => void
}

function toneForCriticality(
  c: Criticality | null | undefined,
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString()
}

/** Feature 3 — system detail + reverse join to controls; obligations/AI placeholders for later phases. */
export function CatalogSystemDrawer({ systemId, onClose }: CatalogSystemDrawerProps) {
  const systemQuery = useQuery({
    queryKey: ['catalog', 'systems', systemId],
    queryFn: async () => {
      const path = `/systems/${systemId}`
      console.log('[RegLens] catalog:system:detail', { systemId, path })
      const row = await apiFetchJson<CatalogSystemRow>(CATALOG_API_BASE_URL, path)
      console.log('[RegLens] catalog:system:detail:ok', { ref: row.ref, criticality: row.criticality })
      return row
    },
  })

  const system = systemQuery.data

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close system drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full min-w-0 w-full max-w-2xl flex-col border-l border-app-border bg-app-surface shadow-xl">
        <header className="shrink-0 border-b border-app-border px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono tracking-tight text-app-muted">
                {system?.ref ?? 'Loading…'}
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-app-text [overflow-wrap:anywhere] sm:text-2xl">
                {system?.displayName ?? 'System'}
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {system ? (
                  <>
                    <StatusBadge
                      label={system.criticality}
                      tone={toneForCriticality(system.criticality)}
                    />
                    {system.domain ? (
                      <StatusBadge label={system.domain} tone="info" />
                    ) : null}
                  </>
                ) : null}
                {systemQuery.isError ? (
                  <StatusBadge label="Failed to load" tone="risk" />
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md border border-app-border px-3 py-2 text-sm text-app-muted transition hover:bg-app-subtle hover:text-app-text"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8">
          {systemQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-3/4 rounded-md bg-app-subtle" />
              <div className="h-4 w-5/6 rounded-md bg-app-subtle" />
              <div className="h-4 w-2/3 rounded-md bg-app-subtle" />
            </div>
          ) : systemQuery.isError ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-5 text-sm text-status-risk">
              Could not load system details.
            </div>
          ) : system ? (
            <div className="mx-auto max-w-full space-y-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Owner team
                  </p>
                  {system.ownerTeam ? (
                    <>
                      <p className="mt-3 text-sm font-semibold leading-snug text-app-text">
                        {system.ownerTeam.name}
                      </p>
                      <p className="mt-2 text-xs text-app-muted">{system.ownerTeam.domain}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-app-muted">—</p>
                  )}
                </div>
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Repository
                  </p>
                  {system.repoUrl ? (
                    <a
                      href={system.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block text-sm font-medium text-brand hover:text-brand-hover [overflow-wrap:anywhere]"
                    >
                      {system.repoUrl}
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-app-muted">—</p>
                  )}
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Created
                  </p>
                  <p className="mt-3 text-sm text-app-text">{formatDate(system.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Description
                </p>
                <p className="mt-4 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                  {system.description ?? '—'}
                </p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Tech stack
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {system.techStack.length ? (
                    system.techStack.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-app-border bg-app-subtle px-3 py-1.5 text-xs text-app-text"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-app-muted">—</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked controls
                </p>
                {system.linkedControls.length ? (
                  <ul className="mt-4 space-y-3 text-sm">
                    {system.linkedControls.map((row) => (
                      <li
                        key={row.controlId}
                        className="rounded-lg border border-app-border bg-app-subtle px-4 py-3"
                      >
                        <p className="font-mono text-xs text-app-muted">{row.ref}</p>
                        <p className="mt-1 font-medium text-app-text">{row.title}</p>
                        <p className="mt-1 text-xs text-app-muted">{row.category}</p>
                        {row.notes ? (
                          <p className="mt-2 text-xs leading-relaxed text-app-muted [overflow-wrap:anywhere]">
                            {row.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No controls linked in the catalogue yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked obligations
                </p>
                <p className="mt-3 text-sm leading-relaxed text-app-muted">
                  Obligations referencing this system will appear here after mapping and impact features land.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked AI systems
                </p>
                <p className="mt-3 text-sm leading-relaxed text-app-muted">
                  AI registry relationships will appear here when the AI governance catalogue is implemented.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
