import { EmptyState } from './EmptyState'
import { StatusBadge } from './StatusBadge'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Ingested" tone="info" />
          <StatusBadge label="In Progress" tone="warning" />
          <StatusBadge label="Mapped" tone="success" />
          <StatusBadge label="High Risk" tone="risk" />
          <StatusBadge label="AI Suggested" tone="ai" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">{description}</p>
      </div>

      <EmptyState
        title="No records yet"
        description="This route is wired and ready for implementation. Add data-fetching and feature components in the next phase without changing the shell."
      />
    </section>
  )
}
