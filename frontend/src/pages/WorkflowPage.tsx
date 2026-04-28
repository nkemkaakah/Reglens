import { EventTimeline } from '../components/EventTimeline'

export function WorkflowPage() {
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
          Global feed
        </p>
        <EventTimeline
          queryKey={['workflow', 'global']}
          fetchPath="/events?size=50"
          emptyLabel="No events yet. Approve mappings, run impact analysis, ingest documents, or register AI systems to populate this feed."
        />
      </div>
    </div>
  )
}
