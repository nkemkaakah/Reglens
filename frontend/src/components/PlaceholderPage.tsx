import { EmptyState } from './EmptyState'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-app-muted">{description}</p>
      </div>

      <EmptyState
        title="Coming soon"
        description="This area is not available in your workspace yet. Your administrator will enable it when your organisation is ready to use it."
      />
    </section>
  )
}
