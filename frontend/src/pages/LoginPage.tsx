import { useNavigate } from 'react-router-dom'
import { beginSession, getPersonas } from '../lib/session'

export function LoginPage() {
  const navigate = useNavigate()
  const personas = getPersonas()

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-6 py-12 text-app-text">
      <div className="w-full max-w-3xl rounded-xl border border-app-border bg-app-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to RegLens</h1>
        <p className="mt-2 text-sm text-app-muted">
          Select a persona to explore the platform.
        </p>

        <div className="mt-6 space-y-3">
          {personas.map((persona) => (
            <button
              key={persona.role}
              type="button"
              className="w-full rounded-lg border border-app-border bg-app-bg px-4 py-3 text-left transition hover:border-brand hover:bg-brand-muted"
              onClick={() => {
                beginSession(persona.role)
                navigate('/ingestion', { replace: true })
              }}
            >
              <p className="text-sm font-semibold">{persona.name}</p>
              <p className="text-sm text-app-muted">{persona.title}</p>
              <p className="mt-1 text-xs text-app-muted">{persona.summary}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
