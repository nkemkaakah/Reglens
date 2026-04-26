import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AiSystemDetailDrawer } from '../components/AiSystemDetailDrawer'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { AI_REGISTRY_API_BASE_URL, apiFetchJson, CATALOG_API_BASE_URL } from '../lib/apiClient'
import type { AiSystemDetail, AiSystemSummary, AiSystemWriteBody, ControlCatalogRow, Page, TeamSummary } from '../types/api'

type Filters = {
  businessDomain: string
  riskRating: string
  status: string
  aiType: string
  q: string
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

function parseDataSources(raw: string): string[] | null {
  const lines = raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
  return lines.length ? lines : null
}

function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t ? t : null
}

export function AiRegistryPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>({
    businessDomain: '',
    riskRating: '',
    status: '',
    aiType: '',
    q: '',
  })
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)

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

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sort', 'ref,asc')
    if (filters.businessDomain.trim()) params.set('businessDomain', filters.businessDomain.trim())
    if (filters.riskRating.trim()) params.set('riskRating', filters.riskRating.trim())
    if (filters.status.trim()) params.set('status', filters.status.trim())
    if (filters.aiType.trim()) params.set('aiType', filters.aiType.trim())
    if (filters.q.trim()) params.set('q', filters.q.trim())
    return params.toString()
  }, [filters, page, size])

  const listQuery = useQuery({
    queryKey: ['ai-registry', 'list', queryParams],
    queryFn: async () => {
      const path = `/ai-systems?${queryParams}`
      return await apiFetchJson<Page<AiSystemSummary>>(AI_REGISTRY_API_BASE_URL, path)
    },
  })

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

  const createMutation = useMutation({
    mutationFn: async (body: AiSystemWriteBody) => {
      return await apiFetchJson<AiSystemDetail>(AI_REGISTRY_API_BASE_URL, '/ai-systems', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-registry', 'list'] })
      setRegisterOpen(false)
    },
  })

  const teams = teamsSeedQuery.data ?? []

  const openRegister = () => {
    const firstTeam = teams[0]
    setFormRef('')
    setFormName('')
    setFormDescription('')
    setFormAiType('LLM')
    setFormUseCase('')
    setFormDomain('')
    setFormModelProvider('')
    setFormModelName('')
    setFormDataSources('')
    setFormOwnerTeamId(firstTeam?.id ?? '')
    setFormTechLead('')
    setFormRisk('MEDIUM')
    setFormDeployedAt('')
    setFormLastReviewed('')
    setFormStatus('PROPOSED')
    setRegisterOpen(true)
  }

  const content = listQuery.data?.content ?? []

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">AI Registry</h2>
            <p className="mt-2 max-w-3xl text-sm text-app-muted">
              A record of every AI system at Nexus Bank - who owns it, what governs it, and which regulations apply.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            onClick={openRegister}
          >
            Register new system
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-text">Refine this list</p>
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-app-border/80 bg-app-subtle/50 p-4 lg:grid-cols-5">
          <label className="block lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-app-text">Search</span>
            <input
              className="mt-1.5 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              placeholder="Ref, name, or description"
              value={filters.q}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, q: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-app-text">Domain</span>
            <input
              className="mt-1.5 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              placeholder="e.g. Credit"
              value={filters.businessDomain}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, businessDomain: e.target.value }))
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-app-text">Risk</span>
            <select
              className="mt-1.5 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              value={filters.riskRating}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, riskRating: e.target.value }))
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
            <span className="text-xs font-semibold uppercase tracking-wide text-app-text">Type</span>
            <select
              className="mt-1.5 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              value={filters.aiType}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, aiType: e.target.value }))
              }}
            >
              <option value="">All</option>
              <option value="ML">ML</option>
              <option value="LLM">LLM</option>
              <option value="GENAI">GenAI</option>
              <option value="RULE_BASED">Rule-based</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-app-text">Status</span>
            <select
              className="mt-1.5 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              value={filters.status}
              onChange={(e) => {
                setPage(0)
                setFilters((s) => ({ ...s, status: e.target.value }))
              }}
            >
              <option value="">All</option>
              <option value="LIVE">Live</option>
              <option value="IN_REVIEW">In review</option>
              <option value="PROPOSED">Proposed</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>
          </label>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-app-subtle" />
            <div className="h-4 w-5/6 rounded bg-app-subtle" />
            <div className="h-4 w-3/4 rounded bg-app-subtle" />
          </div>
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
          Could not load AI systems. Check that ai-registry-service is running (default http://localhost:8083).
        </div>
      ) : content.length ? (
        <div className="rounded-lg border border-app-border bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-app-subtle text-left text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">System</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {content.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer bg-app-surface hover:bg-app-subtle"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs text-app-muted">{row.ref}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold text-app-text">{row.name}</p>
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-app-muted [overflow-wrap:anywhere]">
                        {row.useCase}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.businessDomain ? (
                        <StatusBadge label={row.businessDomain} tone="info" />
                      ) : (
                        <span className="text-sm text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge label={row.aiType} tone="ai" />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.riskRating ? (
                        <StatusBadge label={row.riskRating} tone={toneForRisk(row.riskRating)} />
                      ) : (
                        <span className="text-sm text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-app-text">{row.ownerTeamName ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-app-muted">
                      {row.linkedControlCount} controls · {row.linkedSystemCount} systems
                      <p className="mt-1 text-[11px]">{formatDate(row.deployedAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-sm text-app-muted">
              Page {(listQuery.data?.number ?? 0) + 1} of {listQuery.data?.totalPages ?? 1} ·{' '}
              {listQuery.data?.totalElements ?? content.length} total
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
                disabled={Boolean(listQuery.data?.last)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No AI systems found"
          description="Try different filters or register a new system if you have catalogue owner teams set up."
        />
      )}

      {registerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close registration"
            onClick={() => setRegisterOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-app-border bg-app-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-app-text">Register AI system</h3>
            <p className="mt-1 text-xs text-app-muted">
              Requires a valid owner team from the catalogue and a service bearer token for writes.
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const ref = formRef.trim()
                const name = formName.trim()
                const useCase = formUseCase.trim()
                if (!ref || !name || !useCase || !formOwnerTeamId.trim()) return
                const body: AiSystemWriteBody = {
                  ref,
                  name,
                  description: emptyToNull(formDescription),
                  aiType: formAiType,
                  useCase,
                  businessDomain: emptyToNull(formDomain),
                  modelProvider: emptyToNull(formModelProvider),
                  modelName: emptyToNull(formModelName),
                  dataSources: parseDataSources(formDataSources),
                  ownerTeamId: formOwnerTeamId.trim(),
                  techLeadEmail: emptyToNull(formTechLead),
                  riskRating: formRisk.trim() || null,
                  deployedAt: formDeployedAt.trim() || null,
                  lastReviewed: formLastReviewed.trim() || null,
                  status: formStatus,
                }
                createMutation.mutate(body)
              }}
            >
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
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
              {createMutation.isError ? (
                <p className="text-xs text-status-risk">Registration failed. Confirm catalogue teams and service token.</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-app-border px-4 py-2 text-sm text-app-muted hover:bg-app-subtle"
                  onClick={() => setRegisterOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !teams.length}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedId ? <AiSystemDetailDrawer aiSystemId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </section>
  )
}
