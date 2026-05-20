import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  apiFetchJson,
  apiFetchNoContent,
  IMPACT_API_BASE_URL,
  NOTIFICATION_API_BASE_URL,
  OBLIGATION_API_BASE_URL,
} from '../lib/apiClient'
import type { ImpactIndexSummary, ObligationSummary, Page } from '../types/api'

type NotificationItem = {
  _id: string
  type: string
  title: string
  deepLink: string
  read: boolean
  createdAt: string
}

type NotificationsResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type StatCardProps = {
  label: string
  sub: string
  value: number | undefined
  loading: boolean
  tone: 'warning' | 'success' | 'info' | 'neutral'
  to: string
}

function StatCard({ label, sub, value, loading, tone, to }: StatCardProps) {
  const styles: Record<StatCardProps['tone'], string> = {
    warning:
      'bg-status-warning-soft text-status-warning border-status-warning/35 hover:border-status-warning/60',
    success:
      'bg-status-success-soft text-status-success border-status-success/35 hover:border-status-success/60',
    info: 'bg-brand-muted text-brand border-brand/35 hover:border-brand/60',
    neutral:
      'bg-app-surface text-app-text border-app-border hover:border-app-text/30',
  }

  return (
    <Link
      to={to}
      className={`flex flex-col gap-1 rounded-xl border p-5 transition ${styles[tone]}`}
    >
      <span className="text-3xl font-bold tabular-nums leading-none">
        {loading ? '—' : (value ?? 0).toLocaleString()}
      </span>
      <span className="mt-1 text-sm font-semibold">{label}</span>
      <span className="text-xs opacity-75">{sub}</span>
    </Link>
  )
}

type QuickLinkProps = {
  to: string
  label: string
  sub: string
  urgent?: boolean
}

function QuickLink({ to, label, sub, urgent = false }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className={[
        'flex flex-col rounded-lg border px-4 py-3 text-sm transition hover:bg-app-subtle',
        urgent
          ? 'border-status-warning/40 bg-status-warning-soft'
          : 'border-app-border bg-app-surface',
      ].join(' ')}
    >
      <span className="font-medium text-app-text">{label}</span>
      <span className="mt-0.5 text-xs text-app-muted">{sub}</span>
    </Link>
  )
}

type RecentDoc = {
  documentRef: string
  documentTitle: string
  regulator: string
  createdAt: string
}

function dedupeByDocument(obligations: ObligationSummary[], limit: number): RecentDoc[] {
  const seen = new Set<string>()
  const docs: RecentDoc[] = []
  for (const ob of obligations) {
    if (!seen.has(ob.documentRef)) {
      seen.add(ob.documentRef)
      docs.push({
        documentRef: ob.documentRef,
        documentTitle: ob.documentTitle,
        regulator: ob.regulator,
        createdAt: ob.createdAt,
      })
    }
    if (docs.length >= limit) break
  }
  return docs
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [unmappedQ, inProgressQ, mappedQ, implementedQ, recentObsQ, impactsQ] =
    useQueries({
      queries: [
        {
          queryKey: ['obligations', 'count', 'UNMAPPED'],
          queryFn: () =>
            apiFetchJson<Page<unknown>>(
              OBLIGATION_API_BASE_URL,
              '/obligations?status=UNMAPPED&size=1',
            ),
        },
        {
          queryKey: ['obligations', 'count', 'IN_PROGRESS'],
          queryFn: () =>
            apiFetchJson<Page<unknown>>(
              OBLIGATION_API_BASE_URL,
              '/obligations?status=IN_PROGRESS&size=1',
            ),
        },
        {
          queryKey: ['obligations', 'count', 'MAPPED'],
          queryFn: () =>
            apiFetchJson<Page<unknown>>(
              OBLIGATION_API_BASE_URL,
              '/obligations?status=MAPPED&size=1',
            ),
        },
        {
          queryKey: ['obligations', 'count', 'IMPLEMENTED'],
          queryFn: () =>
            apiFetchJson<Page<unknown>>(
              OBLIGATION_API_BASE_URL,
              '/obligations?status=IMPLEMENTED&size=1',
            ),
        },
        {
          queryKey: ['obligations', 'recent-for-dashboard'],
          queryFn: () =>
            apiFetchJson<Page<ObligationSummary>>(
              OBLIGATION_API_BASE_URL,
              '/obligations?size=30&sort=createdAt,desc',
            ),
        },
        {
          queryKey: ['impacts', 'count'],
          queryFn: () =>
            apiFetchJson<Page<ImpactIndexSummary>>(
              IMPACT_API_BASE_URL,
              '/impacts?size=1',
            ),
        },
      ],
    })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiFetchJson<NotificationsResponse>(
        NOTIFICATION_API_BASE_URL,
        '/notifications?limit=20',
      ),
    refetchInterval: 30_000,
  })

  const readAllMutation = useMutation({
    mutationFn: () =>
      apiFetchNoContent(NOTIFICATION_API_BASE_URL, '/notifications/read-all', {
        method: 'PATCH',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unmapped = unmappedQ.data?.totalElements ?? 0
  const inProgress = inProgressQ.data?.totalElements ?? 0
  const mapped = mappedQ.data?.totalElements ?? 0
  const implemented = implementedQ.data?.totalElements ?? 0
  const totalObligations = unmapped + inProgress + mapped + implemented
  const totalImpacts = impactsQ.data?.totalElements ?? 0

  const recentDocs = dedupeByDocument(recentObsQ.data?.content ?? [], 6)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-app-text">
          {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1 text-sm text-app-muted">
          {today}
          {totalObligations > 0 && (
            <>
              {' · '}
              <span className="text-app-text font-medium">
                {totalObligations.toLocaleString()}
              </span>{' '}
              total obligations across all documents
            </>
          )}
        </p>
      </div>

      {/* Obligation pipeline */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
          Obligation pipeline
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Unmapped"
            sub="Need assignment"
            value={unmappedQ.data?.totalElements}
            loading={unmappedQ.isLoading}
            tone="warning"
            to="/obligations?status=UNMAPPED"
          />
          <StatCard
            label="In progress"
            sub="Being reviewed"
            value={inProgressQ.data?.totalElements}
            loading={inProgressQ.isLoading}
            tone="info"
            to="/obligations?status=IN_PROGRESS"
          />
          <StatCard
            label="Mapped"
            sub="Controls assigned"
            value={mappedQ.data?.totalElements}
            loading={mappedQ.isLoading}
            tone="success"
            to="/obligations?status=MAPPED"
          />
          <StatCard
            label="Implemented"
            sub="Fully closed"
            value={implementedQ.data?.totalElements}
            loading={implementedQ.isLoading}
            tone="neutral"
            to="/obligations?status=IMPLEMENTED"
          />
        </div>
      </section>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        {/* Recent documents */}
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Recently ingested documents
          </p>
          <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            {recentObsQ.isLoading ? (
              <p className="px-5 py-8 text-sm text-app-muted">Loading…</p>
            ) : recentDocs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-app-muted">
                No documents yet.{' '}
                <Link
                  to="/ingestion"
                  className="text-brand underline underline-offset-2"
                >
                  Ingest one →
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-app-border">
                {recentDocs.map((doc) => (
                  <li key={doc.documentRef}>
                    <Link
                      to={`/obligations?q=${encodeURIComponent(doc.documentRef)}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition hover:bg-app-subtle"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-app-text">
                          {doc.documentTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-app-muted">
                          {doc.regulator} · {doc.documentRef}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-app-muted">
                        {formatDate(doc.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
            Quick actions
          </p>
          <div className="space-y-2">
            <QuickLink
              to="/mappings"
              label="Mapping work queue"
              sub={
                unmapped > 0
                  ? `${unmapped.toLocaleString()} obligations waiting`
                  : 'No unmapped obligations'
              }
              urgent={unmapped > 0}
            />
            <QuickLink
              to="/ingestion"
              label="Ingest a document"
              sub="Upload PDF or paste a URL"
            />
            <QuickLink
              to="/impact"
              label="Impact analyses"
              sub={`${totalImpacts.toLocaleString()} ${totalImpacts === 1 ? 'analysis' : 'analyses'} generated`}
            />
            <QuickLink
              to="/workflow"
              label="Audit timeline"
              sub="All activity across services"
            />
            <QuickLink
              to="/ai-registry"
              label="AI system registry"
              sub="Governance & control coverage"
            />
          </div>
        </section>
      </div>

      {/* Notifications */}
      {((notificationsQuery.data?.notifications.length ?? 0) > 0 ||
        notificationsQuery.isLoading) && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
              Recent notifications
            </p>
            {(notificationsQuery.data?.unreadCount ?? 0) > 0 && (
              <button
                type="button"
                className="text-xs text-app-muted underline underline-offset-2 hover:text-app-text disabled:opacity-50"
                disabled={readAllMutation.isPending}
                onClick={() => readAllMutation.mutate()}
              >
                {readAllMutation.isPending ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            {notificationsQuery.isLoading ? (
              <p className="px-5 py-4 text-sm text-app-muted">Loading…</p>
            ) : (
              <ul className="divide-y divide-app-border">
                {notificationsQuery.data?.notifications.slice(0, 5).map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-app-subtle"
                      onClick={async () => {
                        navigate(n.deepLink)
                        if (!n.read) {
                          try {
                            await apiFetchNoContent(
                              NOTIFICATION_API_BASE_URL,
                              `/notifications/${encodeURIComponent(n._id)}/read`,
                              { method: 'PATCH' },
                            )
                            await queryClient.invalidateQueries({
                              queryKey: ['notifications'],
                            })
                          } catch {
                            // best-effort
                          }
                        }
                      }}
                    >
                      <Bell
                        size={14}
                        className={`mt-0.5 shrink-0 ${n.read ? 'text-app-muted' : 'text-brand'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${n.read ? 'text-app-muted' : 'font-medium text-app-text'}`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-app-muted">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
