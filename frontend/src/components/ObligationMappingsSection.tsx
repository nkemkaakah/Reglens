/**
 * TODO — surfacing previously rejected candidates: rejections persist in obligation-service, but
 * suggest-mappings does not read them yet, so the same catalogue row can reappear after a new
 * Suggest. Next step: GET /obligations/{id}/mapping-rejections (or enrich suggest response) and
 * annotate or filter rows against stored rejections.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  apiFetchJson,
  CATALOG_API_BASE_URL,
  MAPPING_API_BASE_URL,
  OBLIGATION_API_BASE_URL,
} from '../lib/apiClient'
import type {
  CatalogSystemRow,
  ControlCatalogRow,
  MappingSuggestion,
  ObligationMappingsResponse,
} from '../types/api'
import { StatusBadge } from './StatusBadge'

type ObligationMappingsSectionProps = {
  obligationId: string
}

function suggestionKey(s: Pick<MappingSuggestion, 'kind' | 'id'>): string {
  return `${s.kind}:${s.id}`
}

function formatPct(confidence: number | null | undefined): string {
  if (confidence == null || Number.isNaN(confidence)) return '—'
  return `${Math.round(confidence * 100)}%`
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

export function ObligationMappingsSection({ obligationId }: ObligationMappingsSectionProps) {
  const queryClient = useQueryClient()
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [reviewerBy, setReviewerBy] = useState(
    () => import.meta.env.VITE_REGLENS_APPROVER?.trim() || 'frontend-demo',
  )
  const [rejectTarget, setRejectTarget] = useState<MappingSuggestion | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    setSuggestions([])
    setSelectedKeys(new Set())
    setEditingKey(null)
    setReviewerBy(import.meta.env.VITE_REGLENS_APPROVER?.trim() || 'frontend-demo')
    setRejectTarget(null)
    setRejectReason('')
  }, [obligationId])

  const mappingsQuery = useQuery({
    queryKey: ['obligations', obligationId, 'mappings'],
    queryFn: () =>
      apiFetchJson<ObligationMappingsResponse>(
        OBLIGATION_API_BASE_URL,
        `/obligations/${obligationId}/mappings`,
      ),
    enabled: Boolean(obligationId),
  })

  const suggestMutation = useMutation({
    mutationFn: () => {
      const suggestedBy = reviewerBy.trim() || 'frontend-demo'
      return apiFetchJson<{ obligationId: string; suggestions: MappingSuggestion[] }>(
        MAPPING_API_BASE_URL,
        `/obligations/${obligationId}/suggest-mappings`,
        { method: 'POST', body: JSON.stringify({ suggestedBy }) },
      )
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions ?? [])
      setSelectedKeys(new Set())
      setEditingKey(null)
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (payload: {
      approvedBy: string
      controls: { controlId: string; confidence: number; explanation: string; source: 'AI_SUGGESTED' }[]
      systems: { systemId: string; confidence: number; explanation: string; source: 'AI_SUGGESTED' }[]
    }) =>
      apiFetchJson<{ obligationId: string; persisted: { controls: number; systems: number } }>(
        MAPPING_API_BASE_URL,
        `/obligations/${obligationId}/mappings`,
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['obligations', obligationId, 'mappings'] })
      await queryClient.invalidateQueries({ queryKey: ['obligations', obligationId, 'impact'] })
      setSuggestions((prev) =>
        prev.filter((s) => {
          if (s.kind === 'control') {
            return !variables.controls.some((c) => c.controlId === s.id)
          }
          return !variables.systems.some((sys) => sys.systemId === s.id)
        }),
      )
      setSelectedKeys(new Set())
      setEditingKey(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (args: { suggestion: MappingSuggestion; rejectedBy: string; reason: string | null }) =>
      apiFetchJson<unknown>(MAPPING_API_BASE_URL, `/obligations/${obligationId}/mapping-rejections`, {
        method: 'POST',
        body: JSON.stringify({
          catalogueKind: args.suggestion.kind,
          catalogueId: args.suggestion.id,
          rejectedBy: args.rejectedBy,
          reason: args.reason,
        }),
      }),
    onSuccess: (_data, variables) => {
      const key = suggestionKey(variables.suggestion)
      setSuggestions((prev) => prev.filter((s) => suggestionKey(s) !== key))
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setEditingKey((k) => (k === key ? null : k))
      setRejectTarget(null)
      setRejectReason('')
    },
  })

  const mappings = mappingsQuery.data
  const approvedControls = mappings?.controls ?? []
  const approvedSystems = mappings?.systems ?? []
  const approvedControlIds = useMemo(
    () => new Set(approvedControls.map((c) => c.controlId)),
    [approvedControls],
  )
  const approvedSystemIds = useMemo(
    () => new Set(approvedSystems.map((s) => s.systemId)),
    [approvedSystems],
  )

  const isAlreadyApproved = useCallback(
    (s: MappingSuggestion) =>
      s.kind === 'control' ? approvedControlIds.has(s.id) : approvedSystemIds.has(s.id),
    [approvedControlIds, approvedSystemIds],
  )

  const suggestedControls = useMemo(
    () => suggestions.filter((s) => s.kind === 'control'),
    [suggestions],
  )
  const suggestedSystems = useMemo(
    () => suggestions.filter((s) => s.kind === 'system'),
    [suggestions],
  )

  const controlIds = useMemo(() => approvedControls.map((c) => c.controlId), [approvedControls])
  const systemIds = useMemo(() => approvedSystems.map((s) => s.systemId), [approvedSystems])

  const controlTitleQueries = useQuery({
    queryKey: ['obligation-mappings', 'control-titles', obligationId, controlIds],
    enabled: controlIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        controlIds.map(async (id) => {
          try {
            const row = await apiFetchJson<ControlCatalogRow>(CATALOG_API_BASE_URL, `/controls/${id}`)
            return [id, row.title] as const
          } catch {
            return [id, null] as const
          }
        }),
      )
      return Object.fromEntries(entries) as Record<string, string | null>
    },
  })

  const systemTitleQueries = useQuery({
    queryKey: ['obligation-mappings', 'system-titles', obligationId, systemIds],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        systemIds.map(async (id) => {
          try {
            const row = await apiFetchJson<CatalogSystemRow>(CATALOG_API_BASE_URL, `/systems/${id}`)
            return [id, row.displayName] as const
          } catch {
            return [id, null] as const
          }
        }),
      )
      return Object.fromEntries(entries) as Record<string, string | null>
    },
  })

  const controlTitles = controlTitleQueries.data ?? {}
  const systemTitles = systemTitleQueries.data ?? {}

  const toggleSelect = useCallback(
    (key: string, s: MappingSuggestion) => {
      if (isAlreadyApproved(s)) return
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [isAlreadyApproved],
  )

  const updateExplanation = useCallback((key: string, explanation: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (suggestionKey(s) === key ? { ...s, explanation } : s)),
    )
  }, [])

  const handleAcceptSelected = () => {
    const byKey = new Map(suggestions.map((s) => [suggestionKey(s), s]))
    const controls: {
      controlId: string
      confidence: number
      explanation: string
      source: 'AI_SUGGESTED'
    }[] = []
    const systems: {
      systemId: string
      confidence: number
      explanation: string
      source: 'AI_SUGGESTED'
    }[] = []

    for (const key of selectedKeys) {
      const s = byKey.get(key)
      if (!s || isAlreadyApproved(s)) continue
      const row = {
        confidence: s.confidence,
        explanation: s.explanation.trim() || '(no explanation)',
        source: 'AI_SUGGESTED' as const,
      }
      if (s.kind === 'control') controls.push({ controlId: s.id, ...row })
      else systems.push({ systemId: s.id, ...row })
    }

    if (controls.length === 0 && systems.length === 0) return
    const name = reviewerBy.trim()
    if (!name) return

    acceptMutation.mutate({
      approvedBy: name,
      controls,
      systems,
    })
  }

  const renderSuggestionCard = (s: MappingSuggestion, accent: 'control' | 'system') => {
    const key = suggestionKey(s)
    const checked = selectedKeys.has(key)
    const editing = editingKey === key
    const approved = isAlreadyApproved(s)
    const borderClass =
      accent === 'control'
        ? 'border-l-4 border-l-brand pl-3'
        : 'border-l-4 border-l-status-warning pl-3'

    return (
      <li
        key={key}
        className={[
          'rounded-lg border border-status-ai/35 bg-status-ai-soft/40 p-4 text-sm',
          borderClass,
          approved ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-start gap-3">
          <label className="mt-0.5 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-app-border disabled:cursor-not-allowed"
              checked={checked}
              disabled={approved}
              onChange={() => toggleSelect(key, s)}
            />
            <StatusBadge label="AI Suggested" tone="ai" />
            {approved ? <StatusBadge label="Already approved" tone="warning" /> : null}
          </label>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-app-text">{s.title}</p>
            <p className="mt-0.5 font-mono text-xs text-app-muted">
              {s.kind} · {s.ref}
            </p>
            {approved ? (
              <p className="mt-2 text-xs text-app-muted">
                <a href="#approved-mappings" className="text-brand hover:underline">
                  View in Approved
                </a>
              </p>
            ) : null}
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-app-muted">
              <span>Confidence {formatPct(s.confidence)}</span>
              <button
                type="button"
                className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-app-border text-[10px] font-semibold leading-none text-app-muted transition hover:border-app-text/25 hover:bg-app-subtle hover:text-app-text"
                aria-label="What confidence means"
                title="How well the catalogue description aligns with the obligation text (model assessment)."
              >
                ?
              </button>
            </p>
            <p className="mt-1 text-xs italic leading-relaxed text-app-muted">{s.confidenceRationale}</p>
            {editing ? (
              <textarea
                className="mt-3 w-full min-h-[88px] rounded-md border border-app-border bg-app-surface px-3 py-2 font-mono text-xs leading-relaxed text-app-text"
                value={s.explanation}
                onChange={(e) => updateExplanation(key, e.target.value)}
                aria-label="Edit explanation before accept"
              />
            ) : (
              <p className="mt-2 leading-relaxed text-app-text">{s.explanation}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-xs font-medium text-app-text transition hover:bg-app-subtle"
                onClick={() => setEditingKey((k) => (k === key ? null : key))}
              >
                {editing ? 'Done editing' : 'Edit explanation'}
              </button>
              <button
                type="button"
                className="rounded-md border border-status-risk/40 px-3 py-1.5 text-xs font-medium text-status-risk transition hover:bg-status-risk-soft"
                onClick={() => {
                  setRejectTarget(s)
                  setRejectReason('')
                }}
              >
                Reject…
              </button>
            </div>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Mappings
          </p>
          <p className="mt-2 text-sm leading-relaxed text-app-muted">
            AI suggests relevant controls and systems. Review each suggestion and approve the ones that
            apply.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={suggestMutation.isPending}
          onClick={() => suggestMutation.mutate()}
        >
          {suggestMutation.isPending ? 'Suggesting…' : 'Suggest mappings'}
        </button>
      </div>

      {suggestMutation.isError ? (
        <p className="mt-4 rounded-lg border border-status-risk/35 bg-status-risk-soft px-4 py-3 text-sm text-status-risk">
          Suggestions could not be generated. Check your connection and try again, or contact your
          administrator if controls and systems catalogues are available but this keeps failing.
        </p>
      ) : null}

      {acceptMutation.isError ? (
        <p className="mt-4 rounded-lg border border-status-risk/35 bg-status-risk-soft px-4 py-3 text-sm text-status-risk">
          Approvals could not be saved. Check your connection and sign-in, then try again.
        </p>
      ) : null}

      {rejectMutation.isError ? (
        <p className="mt-4 rounded-lg border border-status-risk/35 bg-status-risk-soft px-4 py-3 text-sm text-status-risk">
          This rejection could not be recorded. Check your connection and try again.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <div id="approved-mappings">
          <h4 className="text-sm font-semibold text-app-text">Approved</h4>
          {mappingsQuery.isLoading ? (
            <p className="mt-3 text-sm text-app-muted">Loading mappings…</p>
          ) : mappingsQuery.isError ? (
            <p className="mt-3 text-sm text-status-risk">Could not load approved mappings.</p>
          ) : approvedControls.length === 0 && approvedSystems.length === 0 ? (
            <p className="mt-3 text-sm text-app-muted">No approved mappings yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {approvedControls.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-app-border bg-app-subtle p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label="Human Approved" tone="success" />
                    <span className="text-xs font-medium uppercase tracking-wide text-app-muted">
                      Control
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-app-text">
                    {controlTitles[row.controlId] ?? row.controlId}
                  </p>
                  <p className="mt-1 font-mono text-xs text-app-muted">{row.controlId}</p>
                  <p className="mt-2 text-app-muted">
                    Confidence {formatPct(row.confidence)} · {row.approvedBy ?? '—'} ·{' '}
                    {formatWhen(row.approvedAt)}
                  </p>
                  {row.explanation ? (
                    <p className="mt-2 leading-relaxed text-app-text">{row.explanation}</p>
                  ) : null}
                </li>
              ))}
              {approvedSystems.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-app-border bg-app-subtle p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label="Human Approved" tone="success" />
                    <span className="text-xs font-medium uppercase tracking-wide text-app-muted">
                      System
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-app-text">
                    {systemTitles[row.systemId] ?? row.systemId}
                  </p>
                  <p className="mt-1 font-mono text-xs text-app-muted">{row.systemId}</p>
                  <p className="mt-2 text-app-muted">
                    Confidence {formatPct(row.confidence)} · {row.approvedBy ?? '—'} ·{' '}
                    {formatWhen(row.approvedAt)}
                  </p>
                  {row.explanation ? (
                    <p className="mt-2 leading-relaxed text-app-text">{row.explanation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-app-text">AI suggestions</h4>
          {!suggestions.length ? (
            <p className="mt-3 text-sm text-app-muted">
              Run <strong className="font-medium text-app-text">Suggest mappings</strong> to load
              candidates. Select rows, adjust explanation if needed, then accept.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-8">
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Suggested controls
                  </h5>
                  <p className="mt-1 text-sm text-app-muted">
                    Approving a control means this policy or evidence requirement addresses the obligation.
                  </p>
                  {suggestedControls.length ? (
                    <ul className="mt-3 space-y-3">{suggestedControls.map((s) => renderSuggestionCard(s, 'control'))}</ul>
                  ) : (
                    <p className="mt-3 text-sm text-app-muted">None in this batch.</p>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Suggested systems
                  </h5>
                  <p className="mt-1 text-sm text-app-muted">
                    Approving a system means this technology is in-scope and should be monitored or audited
                    for this rule.
                  </p>
                  {suggestedSystems.length ? (
                    <ul className="mt-3 space-y-3">{suggestedSystems.map((s) => renderSuggestionCard(s, 'system'))}</ul>
                  ) : (
                    <p className="mt-3 text-sm text-app-muted">None in this batch.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-5 sm:flex-row sm:items-end">
                <label className="block min-w-0 flex-1 text-xs text-app-muted">
                  <span className="font-semibold uppercase tracking-wide text-app-muted">
                    Reviewer name
                  </span>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                    value={reviewerBy}
                    onChange={(e) => setReviewerBy(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-status-success px-4 py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    acceptMutation.isPending ||
                    selectedKeys.size === 0 ||
                    !reviewerBy.trim()
                  }
                  onClick={handleAcceptSelected}
                >
                  {acceptMutation.isPending ? 'Saving…' : 'Accept selected'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => {
            if (!rejectMutation.isPending) {
              setRejectTarget(null)
              setRejectReason('')
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-mapping-title"
            className="w-full max-w-md rounded-xl border border-app-border bg-app-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reject-mapping-title" className="text-base font-semibold text-app-text">
              Reject suggestion
            </h3>
            <p className="mt-2 text-sm text-app-muted">
              {rejectTarget.title}{' '}
              <span className="font-mono text-xs">({rejectTarget.kind} · {rejectTarget.ref})</span>
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Reason (audit trail)
            </label>
            <textarea
              className="mt-1.5 w-full min-h-[100px] rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this mapping not appropriate?"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-app-border px-4 py-2 text-sm text-app-muted transition hover:bg-app-subtle"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  setRejectTarget(null)
                  setRejectReason('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-status-risk px-4 py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
                disabled={rejectMutation.isPending || !reviewerBy.trim()}
                onClick={() =>
                  rejectMutation.mutate({
                    suggestion: rejectTarget,
                    rejectedBy: reviewerBy.trim(),
                    reason: rejectReason.trim() || null,
                  })
                }
              >
                {rejectMutation.isPending ? 'Saving…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
