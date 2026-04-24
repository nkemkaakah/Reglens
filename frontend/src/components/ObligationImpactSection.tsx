/**
 * Feature 5 — Impact analysis (PRD): structured summary, bullets, per-system rationale,
 * gap/evidence, ticket-shaped tasks. GET /obligations/{id}/impact.
 */
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { apiFetchJson, IMPACT_API_BASE_URL } from '../lib/apiClient'
import type { ImpactResponse, ImpactTaskItem, ImpactTaskRow } from '../types/api'
import { StatusBadge } from './StatusBadge'

type ObligationImpactSectionProps = {
  obligationId: string
  obligationRef: string
}

function fetchStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status
    return typeof s === 'number' ? s : undefined
  }
  return undefined
}

function toneForImpactTag(tag: string): Parameters<typeof StatusBadge>[0]['tone'] {
  const t = tag.trim().toLowerCase().replace(/\s+/g, '-')
  switch (t) {
    case 'breaking':
      return 'risk'
    case 'config-only':
      return 'warning'
    case 'docs-only':
      return 'info'
    default:
      return 'info'
  }
}

function toneForPriority(p: string): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (p.trim().toUpperCase()) {
    case 'HIGH':
      return 'risk'
    case 'MEDIUM':
      return 'warning'
    case 'LOW':
      return 'info'
    default:
      return 'info'
  }
}

function formatImpactTagLabel(tag: string): string {
  return tag
    .trim()
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function formatGeneratedAt(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

/** Keeps long model prose scannable; full text still in DOM for copy/search. */
function ExpandableProse({
  text,
  className = '',
  collapsedClassName = 'line-clamp-4',
  charThreshold = 220,
}: {
  text: string
  className?: string
  collapsedClassName?: string
  charThreshold?: number
}) {
  const [open, setOpen] = useState(false)
  const needsToggle = text.length > charThreshold
  return (
    <div>
      <p
        className={`${className} ${!open && needsToggle ? collapsedClassName : ''} [overflow-wrap:anywhere]`}
      >
        {text}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className="mt-1.5 text-xs font-medium text-brand hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

function buildTicketText(args: {
  obligationRef: string
  system: ImpactTaskRow
  task: ImpactTaskItem
  summary: string
}): string {
  const summaryLine = args.summary.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? args.summary
  const trace: string[] = []
  if (args.task.obligationRef?.trim()) {
    trace.push(`Obligation: ${args.task.obligationRef.trim()}`)
  } else if (args.obligationRef.trim()) {
    trace.push(`Obligation: ${args.obligationRef.trim()}`)
  }
  if (args.task.linkedControlRefs?.length) {
    trace.push(`Controls: ${args.task.linkedControlRefs.join(', ')}`)
  }
  trace.push(`System: ${args.system.displayName} (${args.system.systemRef})`)

  return [
    `[RegLens] ${args.task.title.trim() || args.obligationRef}`,
    '',
    '## Description',
    args.task.description.trim() || '(no description)',
    '',
    '## Context',
    summaryLine,
    '',
    args.system.impactReason?.trim()
      ? `## Why this system\n${args.system.impactReason.trim()}`
      : '',
    args.system.complianceGap?.trim() ? `## Gap\n${args.system.complianceGap.trim()}` : '',
    args.system.evidenceRequired?.trim()
      ? `## Evidence\n${args.system.evidenceRequired.trim()}`
      : '',
    '## Traceability',
    ...trace.map((l) => `- ${l}`),
    args.task.priority?.trim() ? `\nPriority: ${args.task.priority.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function ObligationImpactSection({ obligationId, obligationRef }: ObligationImpactSectionProps) {
  const [copyKey, setCopyKey] = useState<string | null>(null)

  const impactQuery = useQuery({
    queryKey: ['obligations', obligationId, 'impact'],
    queryFn: () =>
      apiFetchJson<ImpactResponse>(IMPACT_API_BASE_URL, `/obligations/${obligationId}/impact`),
    enabled: Boolean(obligationId),
    retry: (failureCount, error) => {
      if (fetchStatus(error) === 404) return false
      return failureCount < 2
    },
  })

  const status = fetchStatus(impactQuery.error)
  const isNotYet = impactQuery.isError && status === 404
  const isOtherError = impactQuery.isError && status !== 404

  const handleCopy = useCallback(
    async (system: ImpactTaskRow, task: ImpactTaskItem, taskIndex: number) => {
      const key = `${system.systemId}-${taskIndex}`
      const text = buildTicketText({
        obligationRef,
        system,
        task,
        summary: impactQuery.data?.summary ?? '',
      })
      try {
        await navigator.clipboard.writeText(text)
        setCopyKey(key)
        window.setTimeout(() => setCopyKey((k) => (k === key ? null : k)), 2000)
      } catch {
        setCopyKey(null)
      }
    },
    [obligationRef, impactQuery.data?.summary],
  )

  const metaLine = useMemo(() => {
    const d = impactQuery.data
    if (!d) return null
    const parts = [`Generated ${formatGeneratedAt(d.generatedAt)}`, d.generatedBy ? `via ${d.generatedBy}` : null]
    return parts.filter(Boolean).join(' · ')
  }, [impactQuery.data])

  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Impact & backlog hints
          </p>
          <p className="mt-2 text-sm leading-relaxed text-app-muted">
            Tight, scannable impact: summary, key bullets, per-system scope, gap, evidence, and backlog-ready
            tasks. Appears after approved mappings are processed.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-app-border px-3 py-2 text-sm text-app-text transition hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-50"
          disabled={impactQuery.isFetching}
          onClick={() => void impactQuery.refetch()}
        >
          {impactQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {impactQuery.isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded-md bg-app-subtle" />
          <div className="h-4 w-5/6 rounded-md bg-app-subtle" />
          <div className="h-24 rounded-lg border border-app-border bg-app-subtle" />
        </div>
      ) : null}

      {isNotYet ? (
        <p className="mt-6 rounded-lg border border-app-border bg-app-subtle px-4 py-3 text-sm text-app-muted">
          Impact not generated yet. It will appear here after you approve mappings and impact-service
          finishes processing the event (use <strong className="font-medium text-app-text">Refresh</strong> if
          you just approved).
        </p>
      ) : null}

      {isOtherError ? (
        <p className="mt-6 rounded-lg border border-status-risk/35 bg-status-risk-soft px-4 py-3 text-sm text-status-risk">
          Could not load impact
          {status != null ? ` (${status})` : ''}. Check that impact-service is running and{' '}
          <code className="font-mono text-xs">VITE_IMPACT_API_URL</code> points to it.
        </p>
      ) : null}

      {impactQuery.data ? (
        <div className="mt-6 space-y-6">
          {metaLine ? <p className="text-xs text-app-muted">{metaLine}</p> : null}

          <div className="rounded-lg border border-app-border bg-app-subtle p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">Summary</p>
            <p className="mt-3 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
              {impactQuery.data.summary}
            </p>
          </div>

          {(impactQuery.data.keyEngineeringImpacts ?? []).length ? (
            <div className="rounded-lg border border-app-border bg-app-subtle p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                Key engineering impacts
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-app-text">
                {(impactQuery.data.keyEngineeringImpacts ?? []).map((line, i) => (
                  <li key={`${i}-${line.slice(0, 48)}`} className="marker:text-app-muted">
                    {line.length > 160 ? (
                      <ExpandableProse text={line} charThreshold={140} collapsedClassName="line-clamp-2" />
                    ) : (
                      <span className="[overflow-wrap:anywhere]">{line}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {impactQuery.data.complianceGap?.trim() ? (
            <div className="rounded-lg border border-status-warning/35 bg-status-warning-soft/50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                Compliance gap
              </p>
              <div className="mt-3 text-sm leading-relaxed text-app-text">
                <ExpandableProse text={impactQuery.data.complianceGap} charThreshold={240} />
              </div>
            </div>
          ) : null}

          <div>
            <h4 className="text-sm font-semibold text-app-text">Per-system impact & tasks</h4>
            {!impactQuery.data.suggestedTasks?.length ? (
              <p className="mt-3 text-sm text-app-muted">No per-system blocks in this analysis.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {impactQuery.data.suggestedTasks.map((sys) => (
                  <li
                    key={sys.systemId}
                    className="rounded-lg border border-app-border bg-app-subtle p-4 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-app-text [overflow-wrap:anywhere]">{sys.displayName}</p>
                        <p className="mt-0.5 font-mono text-xs text-app-muted">{sys.systemRef}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sys.systemPriority?.trim() ? (
                          <StatusBadge
                            label={sys.systemPriority.trim().toUpperCase()}
                            tone={toneForPriority(sys.systemPriority)}
                          />
                        ) : null}
                        {(sys.tags ?? []).map((tag) => (
                          <StatusBadge key={tag} label={formatImpactTagLabel(tag)} tone={toneForImpactTag(tag)} />
                        ))}
                      </div>
                    </div>

                    {sys.impactReason?.trim() ? (
                      <div className="mt-3 border-t border-app-border pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                          Why this system
                        </p>
                        <ExpandableProse
                          text={sys.impactReason}
                          className="mt-1.5 text-sm leading-relaxed text-app-text"
                          charThreshold={200}
                          collapsedClassName="line-clamp-3"
                        />
                      </div>
                    ) : null}

                    {sys.complianceGap?.trim() ? (
                      <div className="mt-3 rounded-md border border-status-warning/30 bg-app-surface px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                          Gap
                        </p>
                        <ExpandableProse
                          text={sys.complianceGap}
                          className="mt-1 text-sm leading-relaxed text-app-text"
                          charThreshold={200}
                          collapsedClassName="line-clamp-3"
                        />
                      </div>
                    ) : null}

                    {sys.evidenceRequired?.trim() ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                          Evidence
                        </p>
                        <ExpandableProse
                          text={sys.evidenceRequired}
                          className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-app-text"
                          charThreshold={220}
                          collapsedClassName="line-clamp-3"
                        />
                      </div>
                    ) : null}

                    <ul className="mt-3 space-y-2 border-t border-app-border pt-3">
                      {(sys.tasks ?? []).map((task, idx) => {
                        const key = `${sys.systemId}-${idx}`
                        return (
                          <li
                            key={key}
                            className="flex flex-col gap-2 rounded-md border border-app-border/80 bg-app-surface p-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-app-text [overflow-wrap:anywhere]">
                                  {task.title?.trim() || 'Task'}
                                </p>
                                {task.priority?.trim() ? (
                                  <StatusBadge
                                    label={task.priority.trim().toUpperCase()}
                                    tone={toneForPriority(task.priority)}
                                  />
                                ) : null}
                              </div>
                              {task.description?.trim() ? (
                                <div className="text-sm leading-relaxed text-app-muted">
                                  <ExpandableProse
                                    text={task.description.trim()}
                                    charThreshold={180}
                                    collapsedClassName="line-clamp-3"
                                  />
                                </div>
                              ) : null}
                              {(task.obligationRef?.trim() || task.linkedControlRefs?.length) ? (
                                <p className="text-xs text-app-muted [overflow-wrap:anywhere]">
                                  {task.obligationRef?.trim() ? (
                                    <span className="mr-2">Obligation: {task.obligationRef}</span>
                                  ) : null}
                                  {task.linkedControlRefs?.length ? (
                                    <span>Controls: {task.linkedControlRefs.join(', ')}</span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="shrink-0 rounded-md border border-brand/40 bg-brand-muted px-3 py-1.5 text-xs font-medium text-brand transition hover:opacity-90"
                              onClick={() => void handleCopy(sys, task, idx)}
                            >
                              {copyKey === key ? 'Copied' : 'Copy as ticket'}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {impactQuery.data.reviewedBy ? (
            <p className="text-xs text-app-muted">
              Reviewed by {impactQuery.data.reviewedBy}
              {impactQuery.data.reviewedAt ? ` · ${formatGeneratedAt(impactQuery.data.reviewedAt)}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
