import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { EventTimeline } from './EventTimeline'
import { ObligationImpactSection } from './ObligationImpactSection'
import { ObligationMappingsSection } from './ObligationMappingsSection'
import { StatusBadge } from './StatusBadge'
import { useRole } from '../hooks/useRole'
import { apiFetchJson, OBLIGATION_API_BASE_URL } from '../lib/apiClient'
import type { ObligationSummary } from '../types/api'

export type ObligationDrawerPanel = 'mappings' | 'impact'

type ObligationDrawerProps = {
  obligationId: string
  onClose: () => void
  /** When set, scrolls the drawer content to the mappings or impact section after detail loads. */
  initialPanel?: ObligationDrawerPanel
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

const IMPLEMENTER_FALLBACK = 'web-ui@reglens.local'

export function ObligationDrawer({ obligationId, onClose, initialPanel }: ObligationDrawerProps) {
  const queryClient = useQueryClient()
  const { canMarkImplemented } = useRole()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mappingsSectionRef = useRef<HTMLDivElement>(null)
  const impactSectionRef = useRef<HTMLDivElement>(null)

  const markImplementedMutation = useMutation({
    mutationFn: async () => {
      const confirmedBy =
        (import.meta.env.VITE_REGLENS_IMPLEMENTER_EMAIL as string | undefined)?.trim() ||
        IMPLEMENTER_FALLBACK
      return apiFetchJson<ObligationSummary>(OBLIGATION_API_BASE_URL, `/obligations/${obligationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IMPLEMENTED', confirmedBy }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['obligations', obligationId] })
    },
  })

  const obligationQuery = useQuery({
    queryKey: ['obligations', obligationId],
    queryFn: async () => {
      const path = `/obligations/${obligationId}`
      console.log('[RegLens] obligation:detail', { obligationId, path })
      const row = await apiFetchJson<ObligationSummary>(
        OBLIGATION_API_BASE_URL,
        path,
      )
      console.log('[RegLens] obligation:detail:ok', { ref: row.ref, status: row.status })
      return row
    },
  })

  const obligation = obligationQuery.data

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 })
  }, [obligationId])

  const lastScrollKeyRef = useRef<string | null>(null)
  useEffect(() => {
    lastScrollKeyRef.current = null
  }, [obligationId])

  useEffect(() => {
    if (!obligation || !initialPanel) return
    const key = `${obligation.id}:${initialPanel}`
    if (lastScrollKeyRef.current === key) return
    lastScrollKeyRef.current = key
    const timer = window.setTimeout(() => {
      const target =
        initialPanel === 'mappings' ? mappingsSectionRef.current : impactSectionRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [obligation?.id, initialPanel, obligation])

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close obligation drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full min-w-0 w-full max-w-2xl flex-col border-l border-app-border bg-app-surface shadow-xl">
        <header className="shrink-0 border-b border-app-border px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono tracking-tight text-app-muted">
                {obligation?.ref ?? 'Loading…'}
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-app-text [overflow-wrap:anywhere] sm:text-2xl">
                {obligation?.title ?? 'Obligation'}
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {obligation ? (
                  <>
                    <StatusBadge
                      label={obligation.status.replace('_', ' ')}
                      tone={toneForStatus(obligation.status)}
                    />
                    {obligation.riskRating ? (
                      <StatusBadge
                        label={`${obligation.riskRating} risk`}
                        tone={toneForRisk(obligation.riskRating)}
                      />
                    ) : null}
                    <StatusBadge label={obligation.regulator} tone="info" />
                  </>
                ) : null}
                {obligationQuery.isError ? (
                  <StatusBadge label="Failed to load" tone="risk" />
                ) : null}
                {obligation?.status === 'MAPPED' && canMarkImplemented ? (
                  <button
                    type="button"
                    disabled={markImplementedMutation.isPending}
                    className="shrink-0 rounded-md border border-status-success/40 bg-status-success-soft px-3 py-1.5 text-xs font-semibold text-status-success transition hover:bg-status-success/15 disabled:opacity-50"
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Mark this obligation as implemented? This sign-off cannot be undone from the UI.',
                        )
                      ) {
                        return
                      }
                      markImplementedMutation.mutate()
                    }}
                  >
                    Mark implemented
                  </button>
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

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8"
        >
          {obligationQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-3/4 rounded-md bg-app-subtle" />
              <div className="h-4 w-5/6 rounded-md bg-app-subtle" />
              <div className="h-4 w-2/3 rounded-md bg-app-subtle" />
            </div>
          ) : obligationQuery.isError ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-5 text-sm text-status-risk">
              Could not load obligation details.
            </div>
          ) : obligation ? (
            <div className="mx-auto max-w-full space-y-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Document
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-snug text-app-text [overflow-wrap:anywhere]">
                    {obligation.documentTitle}
                  </p>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-app-muted [overflow-wrap:anywhere]">
                    {obligation.documentRef}
                  </p>
                </div>
                <div className="rounded-lg border border-app-border bg-app-subtle p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Effective date
                  </p>
                  <p className="mt-3 text-sm text-app-text">{formatDate(obligation.effectiveDate)}</p>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Section
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                    {obligation.sectionRef ?? '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Summary
                </p>
                <p className="mt-4 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                  {obligation.summary}
                </p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Full text
                </p>
                <div className="mt-5 min-w-0 max-w-full overflow-x-auto rounded-lg border border-app-border bg-app-subtle p-5">
                  <pre className="min-w-0 max-w-full whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                    {obligation.fullText}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Topics
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(obligation.topics ?? []).length ? (
                      obligation.topics?.map((t) => (
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
                    AI principles
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(obligation.aiPrinciples ?? []).length ? (
                      obligation.aiPrinciples?.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-status-ai/35 bg-status-ai-soft px-3 py-1.5 text-xs text-status-ai"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-app-muted">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div
                id="obligation-panel-mappings"
                ref={mappingsSectionRef}
                className="scroll-mt-6 rounded-xl border border-app-border bg-app-surface/80 p-1"
              >
                <ObligationMappingsSection obligationId={obligationId} />
              </div>

              <div
                id="obligation-panel-impact"
                ref={impactSectionRef}
                className="scroll-mt-6 rounded-xl border border-app-border bg-app-surface/80 p-1"
              >
                <ObligationImpactSection obligationId={obligationId} obligationRef={obligation.ref} />
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Workflow & approvals
                </p>
                <EventTimeline
                  queryKey={['workflow', 'obligation', obligationId]}
                  fetchPath={`/obligations/${obligationId}/events?size=50`}
                  emptyLabel="No workflow events for this obligation yet."
                />
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
