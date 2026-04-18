import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from './StatusBadge'
import { apiFetchJson, CATALOG_API_BASE_URL } from '../lib/apiClient'
import type { ControlCatalogRow } from '../types/api'

type ControlDrawerProps = {
  controlId: string
  onClose: () => void
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

/** Feature 3 — full control record + join preview; obligations/AI links are placeholders until later phases. */
export function ControlDrawer({ controlId, onClose }: ControlDrawerProps) {
  const controlQuery = useQuery({
    queryKey: ['catalog', 'controls', controlId],
    queryFn: async () => {
      const path = `/controls/${controlId}`
      console.log('[RegLens] catalog:control:detail', { controlId, path })
      const row = await apiFetchJson<ControlCatalogRow>(CATALOG_API_BASE_URL, path)
      console.log('[RegLens] catalog:control:detail:ok', { ref: row.ref, status: row.status })
      return row
    },
  })

  const control = controlQuery.data

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close control drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full min-w-0 w-full max-w-2xl flex-col border-l border-app-border bg-app-surface shadow-xl">
        <header className="shrink-0 border-b border-app-border px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono tracking-tight text-app-muted">
                {control?.ref ?? 'Loading…'}
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-app-text [overflow-wrap:anywhere] sm:text-2xl">
                {control?.title ?? 'Control'}
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {control ? (
                  <>
                    <StatusBadge
                      label={control.status.replaceAll('_', ' ')}
                      tone={toneForControlStatus(control.status)}
                    />
                    <StatusBadge label={control.category} tone="info" />
                  </>
                ) : null}
                {controlQuery.isError ? (
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
          {controlQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-3/4 rounded-md bg-app-subtle" />
              <div className="h-4 w-5/6 rounded-md bg-app-subtle" />
              <div className="h-4 w-2/3 rounded-md bg-app-subtle" />
            </div>
          ) : controlQuery.isError ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-5 text-sm text-status-risk">
              Could not load control details.
            </div>
          ) : control ? (
            <div className="mx-auto max-w-full space-y-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Owner team
                  </p>
                  {control.ownerTeam ? (
                    <>
                      <p className="mt-3 text-sm font-semibold leading-snug text-app-text">
                        {control.ownerTeam.name}
                      </p>
                      <p className="mt-2 text-xs text-app-muted">{control.ownerTeam.domain}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-app-muted">—</p>
                  )}
                </div>
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Catalogue
                  </p>
                  <p className="mt-3 text-sm text-app-text">
                    Created {formatDate(control.createdAt)}
                  </p>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Review cadence
                  </p>
                  <p className="mt-3 text-sm [overflow-wrap:anywhere]">
                    {control.reviewFrequency ?? '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Description
                </p>
                <p className="mt-4 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                  {control.description}
                </p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Evidence type
                </p>
                <p className="mt-4 text-sm text-app-text [overflow-wrap:anywhere]">
                  {control.evidenceType ?? '—'}
                </p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked systems ({control.linkedSystems.length})
                </p>
                {control.linkedSystems.length ? (
                  <ul className="mt-4 space-y-3 text-sm">
                    {control.linkedSystems.map((row) => (
                      <li
                        key={row.systemId}
                        className="rounded-lg border border-app-border bg-app-subtle px-4 py-3"
                      >
                        <p className="font-mono text-xs text-app-muted">{row.ref}</p>
                        <p className="mt-1 font-medium text-app-text">{row.displayName}</p>
                        {row.notes ? (
                          <p className="mt-2 text-xs leading-relaxed text-app-muted [overflow-wrap:anywhere]">
                            {row.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No systems linked in the catalogue yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked obligations
                </p>
                <p className="mt-3 text-sm leading-relaxed text-app-muted">
                  Obligation mappings will appear here after Phase 4 connects obligations to controls.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked AI systems
                </p>
                <p className="mt-3 text-sm leading-relaxed text-app-muted">
                  AI registry links will appear here after the AI system catalogue (Phase 5+) is wired.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
