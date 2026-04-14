type StatusTone = 'success' | 'risk' | 'warning' | 'ai' | 'info'

type StatusBadgeProps = {
  label: string
  tone: StatusTone
}

const toneStyles: Record<StatusTone, string> = {
  success: 'bg-status-success-soft text-status-success border-status-success/35',
  risk: 'bg-status-risk-soft text-status-risk border-status-risk/35',
  warning: 'bg-status-warning-soft text-status-warning border-status-warning/35',
  ai: 'bg-status-ai-soft text-status-ai border-status-ai/35',
  info: 'bg-brand-muted text-brand border-brand/35',
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        toneStyles[tone],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
