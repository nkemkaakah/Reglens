type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-app-border bg-app-surface p-6">
      <h3 className="text-base font-semibold text-app-text">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm text-app-muted">{description}</p>
    </div>
  )
}
