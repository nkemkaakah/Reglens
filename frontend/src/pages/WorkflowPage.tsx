import { useMemo, useState } from 'react'
import { EventTimeline } from '../components/EventTimeline'

const PAGE_SIZE = 15

const TYPE_OPTIONS = [
  { label: 'All event types', value: '' },
  { label: 'Mappings approved', value: 'OBLIGATION_MAPPED' },
  { label: 'Impact generated', value: 'IMPACT_GENERATED' },
  { label: 'Mapping suggested', value: 'MAPPING_SUGGESTED' },
  { label: 'Document ingested', value: 'DOCUMENT_INGESTED' },
  { label: 'AI system created', value: 'AI_SYSTEM_CREATED' },
  { label: 'AI system updated', value: 'AI_SYSTEM_UPDATED' },
]

export function WorkflowPage() {
  const [type, setType] = useState('')
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [page, setPage] = useState(0)
  const [prevFilters, setPrevFilters] = useState({ type, since, until })
  if (prevFilters.type !== type || prevFilters.since !== since || prevFilters.until !== until) {
    setPrevFilters({ type, since, until })
    setPage(0)
  }

  const fetchPath = useMemo(() => {
    const params = new URLSearchParams()
    params.set('size', String(PAGE_SIZE))
    params.set('page', String(page))
    if (type) params.set('type', type)
    if (since) params.set('since', new Date(since).toISOString())
    if (until) params.set('until', new Date(until).toISOString())
    return `/events?${params.toString()}`
  }, [page, since, type, until])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-app-text">Workflow timeline</h2>
        <p className="mt-2 text-sm leading-relaxed text-app-muted">
          Cross-cutting activity from mapping approvals, impact runs, document ingestion, and AI registry
          updates—newest first.
        </p>
      </div>
      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Global feed
          </p>
          <button
            type="button"
            className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-muted hover:bg-app-subtle"
            onClick={() => {
              setType('')
              setSince('')
              setUntil('')
              setPage(0)
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs text-app-muted">
            Event type
            <select
              className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-app-muted">
            Since
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </label>
          <label className="text-xs text-app-muted">
            Until
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
        </div>
        <EventTimeline
          queryKey={['workflow', 'global', type, since, until, page]}
          fetchPath={fetchPath}
          emptyLabel="No events yet. Approve mappings, run impact analysis, ingest documents, or register AI systems to populate this feed."
          pagination={{ onPageChange: setPage }}
        />
      </div>
    </div>
  )
}
