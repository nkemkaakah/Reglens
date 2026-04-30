import { endSession, readSessionToken } from '../lib/session'

type AuthUser = {
  sub: string
  name: string
  email: string
}

type AuthState = {
  user: AuthUser | null
  role: string | null
  isAuthenticated: boolean
}

export function useAuth(): AuthState {
  const payload = readSessionToken()
  if (!payload) {
    return { user: null, role: null, isAuthenticated: false }
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) {
    endSession()
    return { user: null, role: null, isAuthenticated: false }
  }

  return {
    user: {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
    },
    role: payload['https://reglens.io/role'],
    isAuthenticated: true,
  }
}
