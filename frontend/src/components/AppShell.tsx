import { Bell, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

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

export function AppShell() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

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
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-app-border px-2.5 py-2 text-app-muted hover:bg-app-subtle hover:text-app-text"
                  aria-label="Open notifications"
                >
                  <Bell size={16} />
                </button>
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
