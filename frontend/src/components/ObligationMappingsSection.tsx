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
  const [approvedBy, setApprovedBy] = useState(
    () => import.meta.env.VITE_REGLENS_APPROVER?.trim() || 'frontend-demo',
  )

  useEffect(() => {
    setSuggestions([])
    setSelectedKeys(new Set())
    setEditingKey(null)
    setApprovedBy(import.meta.env.VITE_REGLENS_APPROVER?.trim() || 'frontend-demo')
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
    mutationFn: () =>
      apiFetchJson<{ obligationId: string; suggestions: MappingSuggestion[] }>(
        MAPPING_API_BASE_URL,
        `/obligations/${obligationId}/suggest-mappings`,
        { method: 'POST', body: '{}' },
      ),
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

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const updateExplanation = useCallback((key: string, explanation: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (suggestionKey(s) === key ? { ...s, explanation } : s)),
    )
  }, [])

  const rejectSuggestion = useCallback((key: string) => {
    setSuggestions((prev) => prev.filter((s) => suggestionKey(s) !== key))
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setEditingKey((k) => (k === key ? null : k))
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
      if (!s) continue
      const row = {
        confidence: s.confidence,
        explanation: s.explanation.trim() || '(no explanation)',
        source: 'AI_SUGGESTED' as const,
      }
      if (s.kind === 'control') controls.push({ controlId: s.id, ...row })
      else systems.push({ systemId: s.id, ...row })
    }

    if (controls.length === 0 && systems.length === 0) return
    const name = approvedBy.trim()
    if (!name) return

    acceptMutation.mutate({
      approvedBy: name,
      controls,
      systems,
    })
  }

  const mappings = mappingsQuery.data
  const approvedControls = mappings?.controls ?? []
  const approvedSystems = mappings?.systems ?? []
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

  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Mappings
          </p>
          <p className="mt-2 text-sm leading-relaxed text-app-muted">
            Suggested by AI (violet); approved rows are stored in obligation-service (green).
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
          Suggest failed. Ensure mapping-service is running, catalogue has data, and{' '}
          <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> is set for the mapping-service
          container.
        </p>
      ) : null}

      {acceptMutation.isError ? (
        <p className="mt-4 rounded-lg border border-status-risk/35 bg-status-risk-soft px-4 py-3 text-sm text-status-risk">
          Accept failed — check bearer token matches the stack and obligation IDs are valid.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <div>
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
          <h4 className="text-sm font-semibold text-app-text">AI suggestions (pending)</h4>
          {!suggestions.length ? (
            <p className="mt-3 text-sm text-app-muted">
              Run <strong className="font-medium text-app-text">Suggest mappings</strong> to load
              candidates. Select rows, adjust explanation if needed, then accept.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {suggestions.map((s) => {
                  const key = suggestionKey(s)
                  const checked = selectedKeys.has(key)
                  const editing = editingKey === key
                  return (
                    <li
                      key={key}
                      className="rounded-lg border border-status-ai/35 bg-status-ai-soft/40 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <label className="mt-0.5 flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-app-border"
                            checked={checked}
                            onChange={() => toggleSelect(key)}
                          />
                          <StatusBadge label="AI Suggested" tone="ai" />
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-app-text">{s.title}</p>
                          <p className="mt-0.5 font-mono text-xs text-app-muted">
                            {s.kind} · {s.ref}
                          </p>
                          <p className="mt-2 text-app-muted">Confidence {formatPct(s.confidence)}</p>
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
                              onClick={() => rejectSuggestion(key)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-5 sm:flex-row sm:items-end">
                <label className="block min-w-0 flex-1 text-xs text-app-muted">
                  <span className="font-semibold uppercase tracking-wide text-app-muted">
                    Approved by
                  </span>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-status-success px-4 py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    acceptMutation.isPending ||
                    selectedKeys.size === 0 ||
                    !approvedBy.trim()
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
    </div>
  )
}
