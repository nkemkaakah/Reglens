import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EventTimeline } from './EventTimeline'
import { StatusBadge } from './StatusBadge'
import {
  AI_REGISTRY_API_BASE_URL,
  apiFetchJson,
  CATALOG_API_BASE_URL,
} from '../lib/apiClient'
import { aiSystemDetailToFormFields, buildAiSystemWriteBody } from '../lib/aiSystemForm'
import { useRole } from '../hooks/useRole'
import type {
  AiSystemDetail,
  AiSystemDocumentDetail,
  AiSystemDocumentSummary,
  AiSystemDocumentWriteBody,
  AiSystemWriteBody,
  CatalogSystemRow,
  ControlCatalogRow,
  Page,
  TeamSummary,
} from '../types/api'

type AiSystemDetailDrawerProps = {
  aiSystemId: string
  onClose: () => void
}

function toneForRisk(
  r: string | null | undefined,
): Parameters<typeof StatusBadge>[0]['tone'] {
  switch (r) {
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

export function AiSystemDetailDrawer({ aiSystemId, onClose }: AiSystemDetailDrawerProps) {
  const queryClient = useQueryClient()
  const { canManageAiRegistry } = useRole()
  const [docViewerId, setDocViewerId] = useState<string | null>(null)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContentType, setNewDocContentType] = useState('text/plain')
  const [newDocBody, setNewDocBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const [formRef, setFormRef] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAiType, setFormAiType] = useState('LLM')
  const [formUseCase, setFormUseCase] = useState('')
  const [formDomain, setFormDomain] = useState('')
  const [formModelProvider, setFormModelProvider] = useState('')
  const [formModelName, setFormModelName] = useState('')
  const [formDataSources, setFormDataSources] = useState('')
  const [formOwnerTeamId, setFormOwnerTeamId] = useState('')
  const [formTechLead, setFormTechLead] = useState('')
  const [formRisk, setFormRisk] = useState('MEDIUM')
  const [formDeployedAt, setFormDeployedAt] = useState('')
  const [formLastReviewed, setFormLastReviewed] = useState('')
  const [formStatus, setFormStatus] = useState('PROPOSED')

  const detailQuery = useQuery({
    queryKey: ['ai-registry', 'system', aiSystemId],
    queryFn: async () => {
      const path = `/ai-systems/${aiSystemId}`
      return await apiFetchJson<AiSystemDetail>(AI_REGISTRY_API_BASE_URL, path)
    },
  })

  const detail = detailQuery.data

  const teamsSeedQuery = useQuery({
    queryKey: ['catalog', 'controls-for-owner-teams'],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', '0')
      params.set('size', '50')
      params.set('sort', 'ref,asc')
      const data = await apiFetchJson<Page<ControlCatalogRow>>(CATALOG_API_BASE_URL, `/controls?${params}`)
      const byId = new Map<string, TeamSummary>()
      for (const row of data.content) {
        const t = row.ownerTeam
        if (t) byId.set(t.id, t)
      }
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    },
  })
  const teams = teamsSeedQuery.data ?? []

  useEffect(() => {
    setIsEditing(false)
  }, [aiSystemId])

  const hydrateFormFromDetail = (d: AiSystemDetail) => {
    const f = aiSystemDetailToFormFields(d)
    setFormRef(f.formRef)
    setFormName(f.formName)
    setFormDescription(f.formDescription)
    setFormAiType(f.formAiType)
    setFormUseCase(f.formUseCase)
    setFormDomain(f.formDomain)
    setFormModelProvider(f.formModelProvider)
    setFormModelName(f.formModelName)
    setFormDataSources(f.formDataSources)
    setFormOwnerTeamId(f.formOwnerTeamId)
    setFormTechLead(f.formTechLead)
    setFormRisk(f.formRisk)
    setFormDeployedAt(f.formDeployedAt)
    setFormLastReviewed(f.formLastReviewed)
    setFormStatus(f.formStatus)
  }

  const startEditing = () => {
    if (!detail) return
    hydrateFormFromDetail(detail)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (detail) hydrateFormFromDetail(detail)
    setIsEditing(false)
  }

  const updateMutation = useMutation({
    mutationFn: async (body: AiSystemWriteBody) => {
      return await apiFetchJson<AiSystemDetail>(AI_REGISTRY_API_BASE_URL, `/ai-systems/${aiSystemId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-registry', 'system', aiSystemId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-registry', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['workflow', 'ai-system', aiSystemId] })
      setIsEditing(false)
    },
  })

  const controlIds = useMemo(
    () => detail?.linkedControls.map((c) => c.controlId) ?? [],
    [detail?.linkedControls],
  )
  const systemIds = useMemo(
    () => detail?.linkedSystems.map((s) => s.systemId) ?? [],
    [detail?.linkedSystems],
  )

  const controlIdsKey = [...controlIds].sort().join(',')

  const catalogControlsQuery = useQuery({
    queryKey: ['catalog', 'ai-registry-control-details', controlIdsKey],
    enabled: controlIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        controlIds.map(async (id) => {
          const row = await apiFetchJson<ControlCatalogRow>(CATALOG_API_BASE_URL, `/controls/${id}`)
          return [id, row] as const
        }),
      )
      return Object.fromEntries(entries) as Record<string, ControlCatalogRow>
    },
  })

  const catalogSystemsQuery = useQuery({
    queryKey: ['catalog', 'ai-registry-system-details', [...systemIds].sort().join(',')],
    enabled: systemIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        systemIds.map(async (id) => {
          const row = await apiFetchJson<CatalogSystemRow>(CATALOG_API_BASE_URL, `/systems/${id}`)
          return [id, row] as const
        }),
      )
      return Object.fromEntries(entries) as Record<string, CatalogSystemRow>
    },
  })

  const documentsQuery = useQuery({
    queryKey: ['ai-registry', 'documents', aiSystemId],
    queryFn: async () => {
      const path = `/ai-systems/${aiSystemId}/documents`
      return await apiFetchJson<AiSystemDocumentSummary[]>(AI_REGISTRY_API_BASE_URL, path)
    },
  })

  const documentDetailQuery = useQuery({
    queryKey: ['ai-registry', 'document', aiSystemId, docViewerId],
    enabled: Boolean(docViewerId),
    queryFn: async () => {
      const path = `/ai-systems/${aiSystemId}/documents/${docViewerId}`
      return await apiFetchJson<AiSystemDocumentDetail>(AI_REGISTRY_API_BASE_URL, path)
    },
  })

  const createDocMutation = useMutation({
    mutationFn: async (body: AiSystemDocumentWriteBody) => {
      return await apiFetchJson<AiSystemDocumentDetail>(
        AI_REGISTRY_API_BASE_URL,
        `/ai-systems/${aiSystemId}/documents`,
        { method: 'POST', body: JSON.stringify(body) },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-registry', 'documents', aiSystemId] })
      setShowAddDoc(false)
      setNewDocTitle('')
      setNewDocBody('')
      setNewDocContentType('text/plain')
    },
  })

  const controlsById = catalogControlsQuery.data ?? {}
  const systemsById = catalogSystemsQuery.data ?? {}

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close AI system drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full min-w-0 w-full max-w-2xl flex-col border-l border-app-border bg-app-surface shadow-xl">
        <header className="shrink-0 border-b border-app-border px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono tracking-tight text-app-muted">
                {detail?.ref ?? 'Loading…'}
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-app-text [overflow-wrap:anywhere] sm:text-2xl">
                {detail?.name ?? 'AI system'}
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {detail ? (
                  <>
                    {detail.riskRating ? (
                      <StatusBadge label={detail.riskRating} tone={toneForRisk(detail.riskRating)} />
                    ) : null}
                    <StatusBadge label={detail.aiType} tone="info" />
                    {detail.businessDomain ? (
                      <StatusBadge label={detail.businessDomain} tone="info" />
                    ) : null}
                    <StatusBadge label={detail.status} tone="info" />
                  </>
                ) : null}
                {detailQuery.isError ? <StatusBadge label="Failed to load" tone="risk" /> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canManageAiRegistry && detail && !detailQuery.isError ? (
                isEditing ? (
                  <button
                    type="button"
                    className="rounded-md border border-app-border px-3 py-2 text-sm text-app-text transition hover:bg-app-subtle"
                    onClick={cancelEditing}
                  >
                    Cancel edit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-subtle"
                    onClick={startEditing}
                  >
                    Edit
                  </button>
                )
              ) : null}
              <button
                type="button"
                className="rounded-md border border-app-border px-3 py-2 text-sm text-app-muted transition hover:bg-app-subtle hover:text-app-text"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8">
          {detailQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-2/3 rounded-md bg-app-subtle" />
              <div className="h-4 w-5/6 rounded-md bg-app-subtle" />
              <div className="h-4 w-2/3 rounded-md bg-app-subtle" />
            </div>
          ) : detailQuery.isError ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-5 text-sm text-status-risk">
              Could not load AI system details.
            </div>
          ) : detail ? (
            <div className="mx-auto max-w-full space-y-8">
              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">About</p>
                {isEditing ? (
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const ref = formRef.trim()
                      const name = formName.trim()
                      const useCase = formUseCase.trim()
                      if (!ref || !name || !useCase || !formOwnerTeamId.trim()) return
                      updateMutation.mutate(
                        buildAiSystemWriteBody({
                          formRef,
                          formName,
                          formDescription,
                          formAiType,
                          formUseCase,
                          formDomain,
                          formModelProvider,
                          formModelName,
                          formDataSources,
                          formOwnerTeamId,
                          formTechLead,
                          formRisk,
                          formDeployedAt,
                          formLastReviewed,
                          formStatus,
                        }),
                      )
                    }}
                  >
                    <p className="text-xs text-app-muted">
                      Saves governance profile fields; changes appear in Activity below (service bearer token required).
                    </p>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Ref</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formRef}
                        onChange={(e) => setFormRef(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Name</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Use case</span>
                      <textarea
                        className="mt-1 block min-h-[72px] w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formUseCase}
                        onChange={(e) => setFormUseCase(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Description</span>
                      <textarea
                        className="mt-1 block min-h-[56px] w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">AI type</span>
                        <select
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          value={formAiType}
                          onChange={(e) => setFormAiType(e.target.value)}
                        >
                          <option value="ML">ML</option>
                          <option value="LLM">LLM</option>
                          <option value="GENAI">GenAI</option>
                          <option value="RULE_BASED">Rule-based</option>
                          <option value="HYBRID">Hybrid</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">Status</span>
                        <select
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                        >
                          <option value="PROPOSED">Proposed</option>
                          <option value="IN_REVIEW">In review</option>
                          <option value="LIVE">Live</option>
                          <option value="DECOMMISSIONED">Decommissioned</option>
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Business domain</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formDomain}
                        onChange={(e) => setFormDomain(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Owner team</span>
                      <select
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formOwnerTeamId}
                        onChange={(e) => setFormOwnerTeamId(e.target.value)}
                        required
                      >
                        {teams.length === 0 ? (
                          <option value="">Load catalogue for teams…</option>
                        ) : null}
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.domain})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Tech lead email</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        type="email"
                        value={formTechLead}
                        onChange={(e) => setFormTechLead(e.target.value)}
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">Risk rating</span>
                        <select
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          value={formRisk}
                          onChange={(e) => setFormRisk(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">Deployed at</span>
                        <input
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          type="date"
                          value={formDeployedAt}
                          onChange={(e) => setFormDeployedAt(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Last reviewed</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        type="date"
                        value={formLastReviewed}
                        onChange={(e) => setFormLastReviewed(e.target.value)}
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">Model provider</span>
                        <input
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          value={formModelProvider}
                          onChange={(e) => setFormModelProvider(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-app-muted">Model name</span>
                        <input
                          className="mt-1 block w-full rounded-md border border-app-border px-3 py-2 text-sm"
                          value={formModelName}
                          onChange={(e) => setFormModelName(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Data sources (one per line)</span>
                      <textarea
                        className="mt-1 block min-h-[64px] w-full rounded-md border border-app-border px-3 py-2 text-sm"
                        value={formDataSources}
                        onChange={(e) => setFormDataSources(e.target.value)}
                      />
                    </label>
                    {updateMutation.isError ? (
                      <p className="text-xs text-status-risk">
                        Save failed. Confirm catalogue teams and service bearer token for writes.
                      </p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        className="rounded-md border border-app-border px-4 py-2 text-sm text-app-muted hover:bg-app-subtle"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-app-muted">Use case</p>
                        <p className="mt-1 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                          {detail.useCase}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-app-muted">Owner team</p>
                        <p className="mt-1 text-sm text-app-text">{detail.ownerTeamName ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-app-muted">Tech lead</p>
                        <p className="mt-1 text-sm text-app-text">{detail.techLeadEmail ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-app-muted">Model</p>
                        <p className="mt-1 text-sm text-app-text">
                          {[detail.modelProvider, detail.modelName].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-5 text-xs font-semibold text-app-muted">Description</p>
                    <p className="mt-2 text-sm leading-relaxed text-app-text [overflow-wrap:anywhere]">
                      {detail.description ?? '—'}
                    </p>
                    {detail.dataSources?.length ? (
                      <>
                        <p className="mt-5 text-xs font-semibold text-app-muted">Data sources</p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-app-text">
                          {detail.dataSources.map((d) => (
                            <li key={d} className="[overflow-wrap:anywhere]">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <p className="mt-5 text-xs font-semibold text-app-muted">Dates</p>
                    <p className="mt-2 text-sm text-app-text">
                      Deployed {formatDate(detail.deployedAt)} · Last reviewed {formatDate(detail.lastReviewed)} ·
                      Registered {formatDate(detail.createdAt)}
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked controls ({detail.linkedControls.length})
                </p>
                {catalogControlsQuery.isError ? (
                  <p className="mt-4 text-sm text-status-risk">Could not load control names from the catalogue.</p>
                ) : detail.linkedControls.length ? (
                  <ul className="mt-4 space-y-3 text-sm">
                    {detail.linkedControls.map((row) => {
                      const cat = controlsById[row.controlId]
                      return (
                        <li
                          key={row.controlId}
                          className="rounded-lg border border-app-border bg-app-subtle px-4 py-3"
                        >
                          <p className="font-mono text-xs text-app-muted">{cat?.ref ?? row.controlId}</p>
                          <p className="mt-1 font-medium text-app-text">{cat?.title ?? '…'}</p>
                          {cat?.category ? (
                            <p className="mt-1 text-xs text-app-muted">{cat.category}</p>
                          ) : null}
                          {row.notes ? (
                            <p className="mt-2 text-xs leading-relaxed text-app-muted [overflow-wrap:anywhere]">
                              {row.notes}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No controls linked.</p>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked systems ({detail.linkedSystems.length})
                </p>
                {catalogSystemsQuery.isError ? (
                  <p className="mt-4 text-sm text-status-risk">Could not load system names from the catalogue.</p>
                ) : detail.linkedSystems.length ? (
                  <ul className="mt-4 space-y-3 text-sm">
                    {detail.linkedSystems.map((row) => {
                      const sys = systemsById[row.systemId]
                      return (
                        <li
                          key={row.systemId}
                          className="rounded-lg border border-app-border bg-app-subtle px-4 py-3"
                        >
                          <p className="font-mono text-xs text-app-muted">{sys?.ref ?? row.systemId}</p>
                          <p className="mt-1 font-medium text-app-text">{sys?.displayName ?? '…'}</p>
                          {row.relationship ? (
                            <p className="mt-1 text-xs text-app-muted">{row.relationship}</p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No internal systems linked.</p>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Risk assessments ({detail.riskAssessments.length})
                </p>
                {detail.riskAssessments.length ? (
                  <ul className="mt-4 space-y-4 text-sm">
                    {detail.riskAssessments.map((a) => (
                      <li key={a.id} className="rounded-lg border border-app-border bg-app-subtle px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={a.overallRating} tone={toneForRisk(a.overallRating)} />
                          <span className="text-xs text-app-muted">{formatDate(a.assessmentDate)}</span>
                        </div>
                        <p className="mt-2 text-xs text-app-muted">Assessed by {a.assessedBy}</p>
                        <p className="mt-3 text-xs leading-relaxed text-app-text [overflow-wrap:anywhere]">
                          {a.notes}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No assessments recorded.</p>
                )}
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                    Governance documents
                  </p>
                  {canManageAiRegistry ? (
                    <button
                      type="button"
                      className="rounded-md border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text hover:bg-app-subtle"
                      onClick={() => setShowAddDoc((v) => !v)}
                    >
                      {showAddDoc ? 'Cancel' : 'Add document'}
                    </button>
                  ) : null}
                </div>
                {canManageAiRegistry && showAddDoc ? (
                  <form
                    className="mt-4 space-y-3 rounded-lg border border-app-border bg-app-subtle p-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const title = newDocTitle.trim()
                      const body = newDocBody.trim()
                      if (!title || !body) return
                      createDocMutation.mutate({
                        title,
                        contentType: newDocContentType.trim() || 'text/plain',
                        body,
                      })
                    }}
                  >
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Title</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Content type</span>
                      <input
                        className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
                        value={newDocContentType}
                        onChange={(e) => setNewDocContentType(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-app-muted">Body</span>
                      <textarea
                        className="mt-1 block min-h-[120px] w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
                        value={newDocBody}
                        onChange={(e) => setNewDocBody(e.target.value)}
                        required
                      />
                    </label>
                    {createDocMutation.isError ? (
                      <p className="text-xs text-status-risk">Save failed (check service token for writes).</p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={createDocMutation.isPending}
                      className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {createDocMutation.isPending ? 'Saving…' : 'Save document'}
                    </button>
                  </form>
                ) : null}
                {documentsQuery.isLoading ? (
                  <p className="mt-4 text-sm text-app-muted">Loading documents…</p>
                ) : documentsQuery.isError ? (
                  <p className="mt-4 text-sm text-status-risk">Could not load documents.</p>
                ) : documentsQuery.data?.length ? (
                  <ul className="mt-4 divide-y divide-app-border rounded-lg border border-app-border">
                    {documentsQuery.data.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-app-text">{d.title}</p>
                          <p className="text-xs text-app-muted">
                            {d.contentType} · {formatDate(d.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-subtle"
                          onClick={() => setDocViewerId(d.id)}
                        >
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-app-muted">No documents yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Linked obligations
                </p>
                <p className="mt-3 text-sm text-app-muted">Coming soon</p>
              </div>

              <div className="rounded-xl border border-dashed border-app-border bg-app-subtle/60 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                  Pending regulatory impact
                </p>
                <p className="mt-3 text-sm text-app-muted">Coming soon</p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">Activity</p>
                <EventTimeline
                  queryKey={['workflow', 'ai-system', aiSystemId]}
                  fetchPath={`/ai-systems/${aiSystemId}/events?size=50`}
                  emptyLabel="No registry events for this AI system yet."
                />
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {docViewerId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close document"
            onClick={() => setDocViewerId(null)}
          />
          <div className="relative max-h-[85vh] w-full max-w-xl overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <h4 className="truncate text-sm font-semibold text-app-text">
                {documentDetailQuery.data?.title ?? 'Document'}
              </h4>
              <button
                type="button"
                className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-muted hover:bg-app-subtle"
                onClick={() => setDocViewerId(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(85vh-4rem)] overflow-y-auto px-5 py-4">
              {documentDetailQuery.isLoading ? (
                <p className="text-sm text-app-muted">Loading…</p>
              ) : documentDetailQuery.isError ? (
                <p className="text-sm text-status-risk">Could not load document.</p>
              ) : documentDetailQuery.data ? (
                <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-app-text">
                  {documentDetailQuery.data.body}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
