import { TOKEN_STORAGE_KEY } from './auth'

export type UserRole =
  | 'ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'RISK_CONTROL_MANAGER'
  | 'TECHNOLOGY_LEAD'
  | 'AI_GOVERNANCE_LEAD'

export type Persona = {
  sub: string
  name: string
  email: string
  role: UserRole
  title: string
  summary: string
}

type SessionPayload = {
  sub: string
  email: string
  name: string
  aud: string
  iss: string
  iat: number
  exp: number
  'https://reglens.io/role': UserRole
}

const personas: Persona[] = [
  {
    sub: 'demo-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@nexusbank.com',
    role: 'COMPLIANCE_OFFICER',
    title: 'Compliance Officer',
    summary: 'Tracks FCA/PRA obligations and oversees the full compliance pipeline.',
  },
  {
    sub: 'demo-002',
    name: 'James Okafor',
    email: 'james.okafor@nexusbank.com',
    role: 'RISK_CONTROL_MANAGER',
    title: 'Risk & Control Manager',
    summary: 'Owns the control library and reviews mappings and risk ratings.',
  },
  {
    sub: 'demo-003',
    name: 'Priya Nair',
    email: 'priya.nair@nexusbank.com',
    role: 'TECHNOLOGY_LEAD',
    title: 'Technology Lead',
    summary: 'Reviews impact analyses and generated engineering tasks.',
  },
  {
    sub: 'demo-004',
    name: 'Marcus Webb',
    email: 'marcus.webb@nexusbank.com',
    role: 'AI_GOVERNANCE_LEAD',
    title: 'AI Governance Lead',
    summary: 'Manages the AI registry and governance controls for AI systems.',
  },
  {
    sub: 'admin-001',
    name: 'Nkemka',
    email: 'nkemka@nkemka.dev',
    role: 'ADMIN',
    title: 'Administrator',
    summary: 'Full access to all operations across the platform.',
  },
]

const jwtHeader = { alg: 'HS256', typ: 'JWT' }
const tokenAudience = 'https://api.reglens.io'
const tokenIssuer = 'https://demo.reglens.io'

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function getPersonas(): Persona[] {
  return personas
}

export function beginSession(role: UserRole): void {
  const persona = personas.find((candidate) => candidate.role === role)
  if (!persona) {
    throw new Error(`Unknown role: ${role}`)
  }

  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: persona.sub,
    name: persona.name,
    email: persona.email,
    'https://reglens.io/role': persona.role,
    aud: tokenAudience,
    iss: tokenIssuer,
    iat: now,
    exp: now + 3600,
  }

  const token = [
    encodeBase64Url(JSON.stringify(jwtHeader)),
    encodeBase64Url(JSON.stringify(payload)),
    'local-signature',
  ].join('.')

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function endSession(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function readSessionToken(): SessionPayload | null {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as SessionPayload
  } catch {
    return null
  }
}
