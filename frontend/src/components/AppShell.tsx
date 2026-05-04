import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  apiFetchJson,
  apiFetchNoContent,
  NOTIFICATION_API_BASE_URL,
} from '../lib/apiClient'
import { endSession } from '../lib/session'

type ThemeMode = 'light' | 'dark'

type NavItem = {
  label: string
  path: string
}

const navItems: NavItem[] = [
  { label: 'Regulatory Ingestion', path: '/ingestion' },
  { label: 'Obligation Explorer', path: '/obligations' },
  { label: 'Controls Catalogue', path: '/controls' },
  { label: 'Systems Catalogue', path: '/systems' },
  { label: 'AI-Assisted Mappings', path: '/mappings' },
  { label: 'Impact Analyses', path: '/impact' },
  { label: 'AI Registry', path: '/ai-registry' },
  { label: 'Workflow Timeline', path: '/workflow' },
]

const themeStorageKey = 'reglens-theme'

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

type NotificationItem = {
  _id: string
  recipientRole: string
  type: string
  title: string
  deepLink: string
  read: boolean
  createdAt: string
  metadata: Record<string, unknown>
}

type NotificationsResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}

function formatNotificationWhen(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString()
}

export function AppShell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, role } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!notificationsOpen) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (notificationsPanelRef.current?.contains(event.target as Node)) {
        return
      }
      setNotificationsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [notificationsOpen])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-app-border bg-app-subtle px-4 py-6 lg:border-b-0 lg:border-r">
          <div className="mb-8 px-2">
            <h1 className="text-2xl font-semibold tracking-tight">RegLens</h1>
            <p className="mt-1 text-sm text-app-muted">
              Regulatory Change & AI Control Copilot
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-app-muted">
              Organization · Nexus Bank
            </p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'block rounded-md border-l-2 px-3 py-2.5 text-sm transition',
                    isActive
                      ? 'border-brand bg-brand-muted text-app-text'
                      : 'border-transparent text-app-muted hover:bg-app-surface hover:text-app-text',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-app-border bg-app-surface px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-app-muted">
                Ingest sources, triage obligations, map controls and systems, and review impact in one workspace.
              </p>
              <div className="flex items-center gap-2">
                <div className="mr-2 hidden text-right md:block">
                  <p className="text-xs font-medium text-app-text">{user?.name ?? 'Unknown user'}</p>
                  <p className="text-[11px] uppercase tracking-wide text-app-muted">{role ?? 'No role'}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-app-border px-2.5 py-2 text-xs text-app-muted hover:bg-app-subtle hover:text-app-text"
                  onClick={() => {
                    endSession()
                    navigate('/login', { replace: true })
                  }}
                >
                  Switch Persona
                </button>
                <div className="relative" ref={notificationsPanelRef}>
                  <button
                    type="button"
                    className="relative inline-flex items-center rounded-md border border-app-border px-2.5 py-2 text-app-muted hover:bg-app-subtle hover:text-app-text"
                    aria-label="Open notifications"
                    aria-expanded={notificationsOpen}
                    onClick={() => setNotificationsOpen((open) => !open)}
                  >
                    <Bell size={16} />
                    {(notificationsQuery.data?.unreadCount ?? 0) > 0 ? (
                      <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                        {(notificationsQuery.data?.unreadCount ?? 0) > 99
                          ? '99+'
                          : notificationsQuery.data?.unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-app-border bg-app-surface py-2 shadow-lg">
                      <div className="border-b border-app-border px-3 pb-2">
                        <p className="text-sm font-medium text-app-text">Notifications</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notificationsQuery.isLoading ? (
                          <p className="px-3 py-4 text-sm text-app-muted">Loading…</p>
                        ) : notificationsQuery.isError ? (
                          <p className="px-3 py-4 text-sm text-red-600">
                            Could not load notifications.
                          </p>
                        ) : (notificationsQuery.data?.notifications.length ?? 0) === 0 ? (
                          <p className="px-3 py-4 text-sm text-app-muted">
                            No notifications yet.
                          </p>
                        ) : (
                          <ul className="divide-y divide-app-border">
                            {notificationsQuery.data?.notifications.map((n) => (
                              <li key={n._id}>
                                <button
                                  type="button"
                                  className={[
                                    'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-app-subtle',
                                    n.read ? 'text-app-muted' : 'text-app-text font-medium',
                                  ].join(' ')}
                                  onClick={async () => {
                                    setNotificationsOpen(false)
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
                                      } catch (err) {
                                        console.warn(
                                          '[RegLens] mark notification read failed',
                                          err,
                                        )
                                      }
                                    }
                                  }}
                                >
                                  <span className="line-clamp-2">{n.title}</span>
                                  <span className="text-xs font-normal text-app-muted">
                                    {formatNotificationWhen(n.createdAt)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {(notificationsQuery.data?.unreadCount ?? 0) > 0 ? (
                        <div className="border-t border-app-border px-3 pt-2">
                          <button
                            type="button"
                            className="w-full rounded-md border border-app-border py-1.5 text-xs font-medium text-app-text hover:bg-app-subtle disabled:opacity-50"
                            disabled={readAllMutation.isPending}
                            onClick={() => readAllMutation.mutate()}
                          >
                            {readAllMutation.isPending ? 'Marking…' : 'Mark all read'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-app-border px-2.5 py-2 text-app-muted hover:bg-app-subtle hover:text-app-text"
                  onClick={() =>
                    setTheme((previous) =>
                      previous === 'light' ? 'dark' : 'light',
                    )
                  }
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
