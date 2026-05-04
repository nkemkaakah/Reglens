import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useRole } from '../hooks/useRole'
import { StatusBadge } from '../components/StatusBadge'
import {
  apiFetchJson,
  apiUploadForm,
  INGESTION_API_BASE_URL,
} from '../lib/apiClient'
import type {
  IngestJobAccepted,
  IngestJobStatus,
  IngestJobStatusResponse,
  ObligationSummary,
} from '../types/api'

type FormState = {
  regulator: string
  title: string
  docType: string
  sourceUrl: string
  ingestedBy: string
}

const PROGRESS_STEPS = [
  { key: 'queued', label: 'Queued' },
  { key: 'extract', label: 'Extracting & analysing' },
  { key: 'saving', label: 'Saving' },
  { key: 'done', label: 'Done' },
] as const

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
}

function activeStepIndex(
  isSubmitPending: boolean,
  status: IngestJobStatus | undefined,
): number {
  if (isSubmitPending) return 0
  if (!status) return 0
  if (status === 'PENDING') return 0
  if (status === 'PROCESSING') return 1
  return 0
}

function IngestProgressCard({
  activeIndex,
}: {
  activeIndex: number
}) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-6">
      <h3 className="text-sm font-semibold tracking-tight">Ingestion progress</h3>
      <p className="mt-1 text-sm text-app-muted">
        Your document is being queued and processed. This panel updates automatically.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        {PROGRESS_STEPS.map((step, i) => {
          const isPast = i < activeIndex
          const isActive = i === activeIndex
          const isFuture = i > activeIndex
          return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center text-center sm:max-w-[140px]">
              <div className="flex w-full items-center justify-center">
                {i > 0 ? (
                  <div
                    className={[
                      'mr-2 hidden h-px flex-1 sm:block',
                      isPast || isActive ? 'bg-brand/60' : 'bg-app-border',
                    ].join(' ')}
                    aria-hidden
                  />
                ) : null}
                <div
                  className={[
                    'flex h-9 min-w-9 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    isPast
                      ? 'border-brand bg-brand text-white'
                      : isActive
                        ? 'animate-pulse border-brand bg-brand-muted/50 text-brand'
                        : 'border-app-border bg-app-subtle text-app-muted',
                  ].join(' ')}
                >
                  {isPast ? '✓' : i + 1}
                </div>
                {i < PROGRESS_STEPS.length - 1 ? (
                  <div
                    className={[
                      'ml-2 hidden h-px flex-1 sm:block',
                      isPast ? 'bg-brand/60' : 'bg-app-border',
                    ].join(' ')}
                    aria-hidden
                  />
                ) : null}
              </div>
              <p
                className={[
                  'mt-2 flex items-center justify-center gap-1.5 text-xs font-medium leading-snug',
                  isActive ? 'text-app-text' : isFuture ? 'text-app-muted' : 'text-app-text',
                ].join(' ')}
              >
                {isActive ? (
                  <span
                    className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                ) : null}
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function IngestionPage() {
  const { canIngest } = useRole()
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState<FormState>({
    regulator: 'FCA',
    title: '',
    docType: '',
    sourceUrl: '',
    ingestedBy: 'compliance@reglens.dev',
  })
  const [jobId, setJobId] = useState<string | null>(null)

  const submitMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      if (file) {
        fd.append('file', file)
      }
      if (form.sourceUrl.trim()) {
        fd.append('source_url', form.sourceUrl.trim())
      }
      if (form.title.trim()) {
        fd.append('title', form.title.trim())
      }
      if (form.regulator.trim()) {
        fd.append('regulator', form.regulator.trim())
      }
      if (form.docType.trim()) {
        fd.append('doc_type', form.docType.trim())
      }
      if (form.ingestedBy.trim()) {
        fd.append('ingested_by', form.ingestedBy.trim())
      }

      return await apiUploadForm<IngestJobAccepted>(INGESTION_API_BASE_URL, '/api/documents', fd)
    },
    onMutate: () => {
      setJobId(null)
      console.log('[RegLens] ingest:queue', {
        hasFile: Boolean(file),
        hasUrl: Boolean(form.sourceUrl.trim()),
        regulator: form.regulator,
      })
    },
    onSuccess: (data) => {
      setJobId(data.job_id)
      console.log('[RegLens] ingest:accepted', { jobId: data.job_id })
    },
    onError: (error) => {
      console.warn('[RegLens] ingest:error', error)
    },
  })

  const jobQuery = useQuery({
    queryKey: ['ingest-job', jobId],
    queryFn: () =>
      apiFetchJson<IngestJobStatusResponse>(
        INGESTION_API_BASE_URL,
        `/api/documents/jobs/${jobId}`,
      ),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'PENDING' || s === 'PROCESSING' ? 2000 : false
    },
  })

  const jobStatus = jobQuery.data?.status
  const documentId = jobQuery.data?.document_id ?? null

  const obligationsQuery = useQuery({
    queryKey: ['job-obligations', documentId],
    queryFn: () =>
      apiFetchJson<ObligationSummary[]>(
        INGESTION_API_BASE_URL,
        `/api/documents/${documentId}/obligations`,
      ),
    enabled: jobStatus === 'COMPLETED' && Boolean(documentId),
  })

  const canSubmit = useMemo(() => {
    return Boolean(file) || Boolean(form.sourceUrl.trim())
  }, [file, form.sourceUrl])

  const submitErrorMessage = useMemo(() => {
    if (!submitMutation.error) return null
    const maybe = submitMutation.error as { body?: string; message?: string }
    return maybe.body?.slice(0, 1200) ?? maybe.message ?? 'Request failed'
  }, [submitMutation.error])

  const showProgress =
    submitMutation.isPending ||
    (Boolean(jobId) &&
      !jobQuery.isError &&
      (jobQuery.isLoading || jobStatus === 'PENDING' || jobStatus === 'PROCESSING'))

  const showCompleted = jobStatus === 'COMPLETED'
  const showFailed = jobStatus === 'FAILED'

  const progressActiveIndex = activeStepIndex(submitMutation.isPending, jobStatus)

  const showEmpty =
    !showProgress &&
    !showCompleted &&
    !showFailed &&
    !(jobId && jobQuery.isError)

  const firstOb = obligationsQuery.data?.[0]

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Regulatory Ingestion</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">
          Add a new regulatory source by uploading a PDF or text file, or by pasting a URL. RegLens registers
          the document and extracts obligations so your team can triage, map, and assess impact in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <h3 className="text-sm font-semibold tracking-tight">New ingest</h3>
          {canIngest ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!canSubmit || submitMutation.isPending) return
                submitMutation.mutate()
              }}
            >
              <label className="block">
                <span className="text-xs font-medium text-app-muted">File (optional)</span>
                <input
                  className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text file:mr-3 file:rounded-md file:border-0 file:bg-brand-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-app-subtle"
                  type="file"
                  accept=".pdf,.txt,.md,.html,.htm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-app-muted">Source URL (optional)</span>
                <input
                  className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                  placeholder="https://www.fca.org.uk/..."
                  value={form.sourceUrl}
                  onChange={(e) => setForm((s) => ({ ...s, sourceUrl: e.target.value }))}
                />
                <p className="mt-1 text-xs text-app-muted">Provide at least a file or URL.</p>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Regulator</span>
                  <input
                    className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                    value={form.regulator}
                    onChange={(e) => setForm((s) => ({ ...s, regulator: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-app-muted">Doc type</span>
                  <input
                    className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                    placeholder="Guidance / Policy Statement"
                    value={form.docType}
                    onChange={(e) => setForm((s) => ({ ...s, docType: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-app-muted">Title (optional)</span>
                <input
                  className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                  placeholder="FCA AI Update 2024"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-app-muted">Ingested by</span>
                <input
                  className="mt-1 block w-full rounded-md border border-app-border bg-app-subtle px-3 py-2 text-sm text-app-text"
                  value={form.ingestedBy}
                  onChange={(e) => setForm((s) => ({ ...s, ingestedBy: e.target.value }))}
                />
              </label>

              {submitErrorMessage ? (
                <div className="rounded-md border border-status-risk/35 bg-status-risk-soft px-3 py-2 text-sm text-status-risk">
                  {submitErrorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || submitMutation.isPending}
                className={[
                  'inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition',
                  !canSubmit || submitMutation.isPending
                    ? 'cursor-not-allowed bg-app-subtle text-app-muted'
                    : 'bg-brand text-white hover:bg-brand-hover',
                ].join(' ')}
              >
                {submitMutation.isPending ? 'Queuing…' : 'Ingest document'}
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-md border border-app-border bg-app-subtle p-3 text-sm text-app-muted">
              You have read-only access here. Document ingestion is restricted to Compliance Officers.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {showProgress ? <IngestProgressCard activeIndex={progressActiveIndex} /> : null}

          {jobId && jobQuery.isError ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6">
              <h3 className="text-sm font-semibold text-status-risk">Could not load job status</h3>
              <p className="mt-2 text-sm text-app-text">
                {(jobQuery.error as { body?: string; message?: string })?.body?.slice(0, 800) ??
                  (jobQuery.error as Error)?.message ??
                  'Request failed'}
              </p>
            </div>
          ) : null}

          {showFailed ? (
            <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6">
              <h3 className="text-sm font-semibold text-status-risk">Ingestion failed</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-app-text">
                {jobQuery.data?.error?.trim() || 'The ingestion job failed.'}
              </p>
            </div>
          ) : null}

          {showCompleted ? (
            <>
              <div className="rounded-lg border border-app-border bg-app-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Registered document</h3>
                    <p className="mt-1 text-sm text-app-muted">
                      {firstOb?.documentTitle ?? 'Document'}{' '}
                      <span className="text-app-muted">·</span>{' '}
                      <span className="font-mono text-xs text-app-muted">
                        {firstOb?.documentRef ?? documentId}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {firstOb?.regulator ? (
                      <StatusBadge label={firstOb.regulator} tone="info" />
                    ) : null}
                    <StatusBadge
                      label={`${jobQuery.data?.obligation_count ?? obligationsQuery.data?.length ?? 0} obligations`}
                      tone="success"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-app-border bg-app-subtle p-3">
                    <p className="text-xs font-medium text-app-muted">Completed at</p>
                    <p className="mt-1 text-sm">{formatDateTime(jobQuery.data?.completed_at)}</p>
                  </div>
                  <div className="rounded-md border border-app-border bg-app-subtle p-3">
                    <p className="text-xs font-medium text-app-muted">Document ID</p>
                    <p className="mt-1 break-all font-mono text-sm">{documentId}</p>
                  </div>
                </div>
              </div>

              {obligationsQuery.isLoading ? (
                <div className="rounded-lg border border-app-border bg-app-surface p-6 text-sm text-app-muted">
                  Loading obligations…
                </div>
              ) : obligationsQuery.isError ? (
                <div className="rounded-lg border border-status-risk/35 bg-status-risk-soft p-6 text-sm text-status-risk">
                  Could not load obligations for this document.
                </div>
              ) : obligationsQuery.data?.length ? (
                <div className="rounded-lg border border-app-border bg-app-surface p-6">
                  <h3 className="text-sm font-semibold tracking-tight">Extracted obligations</h3>
                  <p className="mt-1 text-sm text-app-muted">
                    These obligations are saved and available in Obligation Explorer for triage and mapping.
                  </p>
                  <div className="mt-4 divide-y divide-app-border rounded-md border border-app-border">
                    {obligationsQuery.data.map((ob) => (
                      <div key={ob.id} className="bg-app-surface p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-app-muted">{ob.ref}</p>
                            <p className="mt-1 truncate text-sm font-semibold">{ob.title}</p>
                            <p className="mt-1 max-w-2xl text-sm text-app-muted">{ob.summary}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StatusBadge label={ob.status.replace('_', ' ')} tone={toneForStatus(ob.status)} />
                            {ob.riskRating ? (
                              <StatusBadge label={`${ob.riskRating} risk`} tone={toneForRisk(ob.riskRating)} />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-app-border bg-app-surface p-6 text-sm text-app-muted">
                  No obligations returned for this document.
                </div>
              )}
            </>
          ) : null}

          {showEmpty ? (
            <EmptyState
              title="No ingestion run yet"
              description="Submit a file or URL on the left to register a document and extract obligations for review."
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
