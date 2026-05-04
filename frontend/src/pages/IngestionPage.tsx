import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useRole } from '../hooks/useRole'
import { StatusBadge } from '../components/StatusBadge'
import {
  apiUploadForm,
  INGESTION_API_BASE_URL,
} from '../lib/apiClient'
import type { IngestResponse, ObligationSummary } from '../types/api'

type FormState = {
  regulator: string
  title: string
  docType: string
  sourceUrl: string
  ingestedBy: string
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
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

  const mutation = useMutation({
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

      return await apiUploadForm<IngestResponse>(
        INGESTION_API_BASE_URL,
        '/api/documents',
        fd,
      )
    },
    onMutate: () => {
      console.log('[RegLens] ingest:start', {
        hasFile: Boolean(file),
        hasUrl: Boolean(form.sourceUrl.trim()),
        regulator: form.regulator,
      })
    },
    onSuccess: (data) => {
      console.log('[RegLens] ingest:success', {
        documentId: data.document.id,
        obligationCount: data.obligationCount,
      })
    },
    onError: (error) => {
      console.warn('[RegLens] ingest:error', error)
    },
  })

  const canSubmit = useMemo(() => {
    return Boolean(file) || Boolean(form.sourceUrl.trim())
  }, [file, form.sourceUrl])

  const errorMessage = useMemo(() => {
    if (!mutation.error) return null
    const maybe = mutation.error as { body?: string; message?: string }
    return maybe.body?.slice(0, 1200) ?? maybe.message ?? 'Request failed'
  }, [mutation.error])

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
                if (!canSubmit || mutation.isPending) return
                mutation.mutate()
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
              <p className="mt-1 text-xs text-app-muted">
                Provide at least a file or URL.
              </p>
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

            {errorMessage ? (
              <div className="rounded-md border border-status-risk/35 bg-status-risk-soft px-3 py-2 text-sm text-status-risk">
                {errorMessage}
              </div>
            ) : null}

              <button
                type="submit"
                disabled={!canSubmit || mutation.isPending}
                className={[
                  'inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition',
                  !canSubmit || mutation.isPending
                    ? 'cursor-not-allowed bg-app-subtle text-app-muted'
                    : 'bg-brand text-white hover:bg-brand-hover',
                ].join(' ')}
              >
                {mutation.isPending ? 'Ingesting…' : 'Ingest document'}
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-md border border-app-border bg-app-subtle p-3 text-sm text-app-muted">
              You have read-only access here. Document ingestion is restricted to Compliance Officers.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {mutation.data ? (
            <div className="rounded-lg border border-app-border bg-app-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Registered document</h3>
                  <p className="mt-1 text-sm text-app-muted">
                    {mutation.data.document.title}{' '}
                    <span className="text-app-muted">·</span>{' '}
                    <span className="font-mono text-xs text-app-muted">
                      {mutation.data.document.ref}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={mutation.data.document.regulator} tone="info" />
                  <StatusBadge
                    label={`${mutation.data.obligationCount} obligations`}
                    tone="success"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-app-border bg-app-subtle p-3">
                  <p className="text-xs font-medium text-app-muted">Ingested at</p>
                  <p className="mt-1 text-sm">{formatDateTime(mutation.data.document.ingestedAt)}</p>
                </div>
                <div className="rounded-md border border-app-border bg-app-subtle p-3">
                  <p className="text-xs font-medium text-app-muted">Ingested by</p>
                  <p className="mt-1 text-sm">{mutation.data.document.ingestedBy}</p>
                </div>
              </div>
            </div>
          ) : null}

          {mutation.data?.obligations?.length ? (
            <div className="rounded-lg border border-app-border bg-app-surface p-6">
              <h3 className="text-sm font-semibold tracking-tight">Extracted obligations</h3>
              <p className="mt-1 text-sm text-app-muted">
                These obligations are saved and available in Obligation Explorer for triage and mapping.
              </p>
              <div className="mt-4 divide-y divide-app-border rounded-md border border-app-border">
                {mutation.data.obligations.map((ob) => (
                  <div key={ob.id} className="bg-app-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-app-muted">{ob.ref}</p>
                        <p className="mt-1 truncate text-sm font-semibold">{ob.title}</p>
                        <p className="mt-1 max-w-2xl text-sm text-app-muted">
                          {ob.summary}
                        </p>
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
            <EmptyState
              title="No ingestion run yet"
              description="Submit a file or URL on the left to register a document and extract obligations for review."
            />
          )}
        </div>
      </div>
    </section>
  )
}

