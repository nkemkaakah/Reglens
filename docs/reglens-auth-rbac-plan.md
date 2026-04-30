# Reglens Auth & RBAC Plan

## Overview

This document defines the authentication and role-based access control (RBAC) strategy for the Reglens Regulatory Change & AI Control Copilot. It covers how users log in, how the system knows who they are, what each role is allowed to do, and how the demo mode works.

Reglens is a portfolio/demo project. The goal is a system that feels real and production-grade — with proper identity, protected API routes, and meaningful role restrictions — while being completely self-contained with no external dependencies. There is no Auth0 account required, no third-party login service, and no cloud setup. Everything runs locally with Docker Compose.

---

## Part 1 — Authentication Approach

### Why Not Auth0

Auth0 is the industry-standard identity platform used in real production systems. For a live product, it would be the right choice. For Reglens, it introduces unnecessary friction:

- External dependency — the app cannot run fully offline or without internet
- Setup overhead — tenant configuration, callback URLs, Login Actions, API registration
- Demo blocker — recruiters and reviewers hitting a real Auth0 login wall are likely to stop there

Since Reglens is a demo project, a self-contained approach delivers the same engineering value without any of the friction.

### What We Use Instead: Demo JWT Auth

Authentication in Reglens uses **self-generated JWTs** — tokens that the frontend creates directly when a user clicks a persona button. These tokens are structured exactly like real Auth0 JWTs: they have the same `sub`, `aud`, `iss`, `exp`, and custom role claim fields. The backend services validate them the same way they would validate any JWT.

The only difference from a real JWT is that the signature is not cryptographically signed by a third-party provider. For a demo project where the goal is to demonstrate the architecture and RBAC patterns — not to secure real user data — this is completely appropriate and widely accepted.

### How the Token Works

```
User clicks persona button
        ↓
Frontend generates a JWT with { sub, role, aud, iss, exp }
        ↓
JWT stored in localStorage
        ↓
Every API request includes: Authorization: Bearer <token>
        ↓
Spring Cloud Gateway validates token structure + reads role
        ↓
Individual services check role claim → allow or reject
```

The JWT contains a custom claim — `https://reglens.io/role` — that holds the user's role (e.g. `COMPLIANCE_OFFICER`). Every service reads this claim to enforce access control.

### Token Structure

```json
{
  "sub": "demo-compliance-officer",
  "email": "sarah.chen@nexusbank.com",
  "name": "Sarah Chen",
  "https://reglens.io/role": "COMPLIANCE_OFFICER",
  "aud": "https://api.reglens.io",
  "iss": "https://demo.reglens.io",
  "iat": 1714000000,
  "exp": 1714003600
}
```

### Session Behaviour

- Tokens expire after **1 hour** from creation.
- On logout, the token is removed from localStorage and the app resets to the login screen.
- On expiry, the app detects the expired token and redirects to the login screen automatically.
- There is no silent refresh — in a demo context, users simply click a persona button again.

---

## Part 2 — Demo Mode Login

### Design

The login screen does not ask for a username or password. Instead, it presents four persona cards — one for each Nexus Bank role. The user clicks any card and is immediately signed in as that persona, with the correct role and a pre-populated identity.

This is the entire login experience. There is no email field, no password field, no "forgot password" link. The login page exists purely to demonstrate that different roles see different things.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          Welcome to Reglens                             │
│    Nexus Bank Regulatory Change & AI Copilot            │
│                                                         │
│    Select a persona to explore the platform:            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  👤  Sarah Chen                                  │   │
│  │      Compliance Officer                          │   │
│  │      Tracks FCA/PRA obligations, approves        │   │
│  │      mappings, oversees the full pipeline        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  👤  James Okafor                                │   │
│  │      Risk & Control Manager                      │   │
│  │      Owns the control library, reviews           │   │
│  │      risk ratings and obligation mappings        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  👤  Priya Nair                                  │   │
│  │      Technology Lead                             │   │
│  │      Reviews impact analyses and engineering     │   │
│  │      tasks generated for her systems             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  👤  Marcus Webb                                 │   │
│  │      AI Governance Lead                          │   │
│  │      Manages the AI Registry, ensures all        │   │
│  │      AI deployments are governed and auditable   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### What Happens When a Persona is Clicked

1. The frontend generates a JWT payload for that persona (sub, email, name, role, aud, iss, exp).
2. The payload is base64-encoded as the token body.
3. The token is stored in `localStorage` under the key `reglens_token`.
4. The React app reads the token, decodes the role, and redirects to the main dashboard.
5. All subsequent API calls include `Authorization: Bearer <token>` in the request header.
6. The app's UI adapts immediately — navigation items, action buttons, and visible content all reflect the selected role.

### Switching Personas

A "Switch Persona" button is visible in the top-right of the app header at all times (next to the user avatar). Clicking it logs the current user out, clears the token from localStorage, and returns to the login/persona selection screen. This allows a demo viewer to switch between roles mid-demo without reloading the page.

---

## Part 3 — Roles & Permissions

### The Four Roles

Reglens has four roles, each mapped to a Nexus Bank persona. The role is embedded in the JWT and read by every backend service to enforce access control.

---

### Role 1 — COMPLIANCE_OFFICER

**Persona:** Sarah Chen, Regulatory Compliance  
**Primary concern:** Tracking new regulatory documents, managing obligations, overseeing the full compliance pipeline.

This is the most powerful role. Compliance Officers drive the core workflow — they ingest documents, review obligations, and approve or reject AI-suggested mappings.

| Feature Area | Permission |
|---|---|
| Regulatory Documents | Upload new documents, view all documents |
| Obligations | View all, create, edit status, approve/reject mappings |
| AI Mapping Suggestions | Trigger suggestions, accept, reject, edit |
| Impact Analyses | View all, trigger re-analysis |
| Control Catalogue | View all controls |
| System Catalogue | View all systems |
| AI Registry | View all AI systems, view governance details |
| Workflow / Audit Trail | View full audit trail for all obligations |
| Notifications | Receives: new high-priority obligations, new documents ingested, overdue tasks |
| User Management | No access |

---

### Role 2 — RISK_CONTROL_MANAGER

**Persona:** James Okafor, Risk & Control  
**Primary concern:** Maintaining the control library, reviewing how obligations map to controls, assessing risk ratings.

Risk & Control Managers own the control catalogue. They can edit controls and review mappings that touch their domain, but cannot ingest new regulatory documents or manage the AI Registry.

| Feature Area | Permission |
|---|---|
| Regulatory Documents | View only |
| Obligations | View all, edit risk rating, view mappings |
| AI Mapping Suggestions | View suggestions, accept/reject mappings that involve controls they own |
| Impact Analyses | View all |
| Control Catalogue | View, create, edit, delete controls |
| System Catalogue | View all systems |
| AI Registry | View only |
| Workflow / Audit Trail | View audit trail for obligations and controls |
| Notifications | Receives: new obligation mapped to a control they own, control impacted by new regulation |
| User Management | No access |

---

### Role 3 — TECHNOLOGY_LEAD

**Persona:** Priya Nair, Engineering  
**Primary concern:** Understanding which systems are impacted by regulatory changes, reviewing engineering backlog items generated by impact analysis.

Technology Leads are consumers of the compliance pipeline output. They can see impact analyses and copy engineering tasks, but cannot change the compliance data itself.

| Feature Area | Permission |
|---|---|
| Regulatory Documents | View only |
| Obligations | View only |
| AI Mapping Suggestions | View only |
| Impact Analyses | View all, copy task descriptions, mark tasks as acknowledged |
| Control Catalogue | View only |
| System Catalogue | View, edit systems they are listed as owner of |
| AI Registry | View AI systems linked to their domain |
| Workflow / Audit Trail | View events related to systems they own |
| Notifications | Receives: impact analysis generated for a system they own, engineering task assigned to their domain |
| User Management | No access |

---

### Role 4 — AI_GOVERNANCE_LEAD

**Persona:** Marcus Webb, AI Governance  
**Primary concern:** Full visibility and control over the AI System Registry — ensuring every AI deployment at Nexus Bank is properly governed, risk-rated, and linked to relevant obligations and controls.

The AI Governance Lead has full write access to the AI Registry and read-only access everywhere else.

| Feature Area | Permission |
|---|---|
| Regulatory Documents | View only |
| Obligations | View only, specifically those tagged with AI-related topics |
| AI Mapping Suggestions | View only |
| Impact Analyses | View analyses that involve AI systems |
| Control Catalogue | View only |
| System Catalogue | View only |
| AI Registry | Full access: create, view, edit, delete AI systems; manage governance documents; update risk ratings |
| Workflow / Audit Trail | View full audit trail for all AI systems |
| Notifications | Receives: new AI system registered, AI system lifecycle event (CREATED/UPDATED), new obligation with AI_PRINCIPLE tag |
| User Management | No access |

---

## Part 4 — How RBAC is Enforced

### Backend Enforcement (The Real Guard)

Every backend service (Spring Boot Java services, Node/Express services) validates the JWT on every request. Middleware extracts the role from the `https://reglens.io/role` claim and checks it against the required permission for that endpoint.

Example: `POST /documents` requires `COMPLIANCE_OFFICER`. If the token carries `TECHNOLOGY_LEAD`, the service returns `HTTP 403 Forbidden` immediately, before any business logic runs.

RBAC is enforced at the **API level** — never just in the frontend. The UI hides or disables buttons based on role to improve UX, but this is a convenience, not a security measure. A user who bypassed the UI and called the API directly would still get rejected by the backend.

### Spring Boot Services (Java)

Each Spring Boot service uses `spring-boot-starter-oauth2-resource-server` to validate JWTs. A custom `JwtDecoder` bean is configured to accept the demo token format (no external JWKS endpoint needed — it validates the token structure and claims directly).

Endpoints are protected with `@PreAuthorize`:

```java
@PreAuthorize("hasRole('COMPLIANCE_OFFICER')")
@PostMapping("/documents")
public ResponseEntity<?> ingestDocument(...) { ... }
```

### Node/Express Services (mapping-service, notification-service)

Each Node service uses a custom JWT middleware that decodes the token, validates the `iss`, `aud`, and `exp` claims, and attaches the role to the request object:

```typescript
app.use(demoJwtMiddleware); // validates token, sets req.userRole

app.get('/notifications', (req, res) => {
  const role = req.userRole; // e.g. "COMPLIANCE_OFFICER"
  // filter notifications by role
});
```

### Spring Cloud Gateway

The API Gateway validates the JWT on every inbound request before forwarding to any service. Invalid or expired tokens are rejected at the gateway with `HTTP 401`, before the request reaches any microservice.

### Frontend Enforcement (UX Only)

The React frontend reads the role from the decoded JWT via a `useRole()` hook and uses it to:
- Show or hide navigation items (e.g. Technology Leads do not see the "Ingest Document" button)
- Disable action buttons on detail pages (e.g. "Approve Mapping" is greyed out for read-only roles)
- Show role-appropriate empty states (e.g. "Contact your Compliance Officer to ingest a document")

This is purely for user experience. Security lives in the backend.

---

## Part 5 — Frontend Implementation

### useAuth Hook

```tsx
// hooks/useAuth.ts
export function useAuth() {
  const token = localStorage.getItem('reglens_token');
  if (!token) return { user: null, role: null, isAuthenticated: false };

  const payload = JSON.parse(atob(token.split('.')));
  const isExpired = payload.exp < Math.floor(Date.now() / 1000);
  if (isExpired) {
    localStorage.removeItem('reglens_token');
    return { user: null, role: null, isAuthenticated: false };
  }

  return {
    user: { name: payload.name, email: payload.email },
    role: payload['https://reglens.io/role'],
    isAuthenticated: true
  };
}
```

### useRole Hook

```tsx
// hooks/useRole.ts
export function useRole() {
  const { role } = useAuth();
  return {
    role,
    isComplianceOfficer: role === 'COMPLIANCE_OFFICER',
    isRiskControlManager: role === 'RISK_CONTROL_MANAGER',
    isTechnologyLead: role === 'TECHNOLOGY_LEAD',
    isAiGovernanceLead: role === 'AI_GOVERNANCE_LEAD',
    canEdit: role === 'COMPLIANCE_OFFICER' || role === 'RISK_CONTROL_MANAGER',
    canIngest: role === 'COMPLIANCE_OFFICER',
    canManageAiRegistry: role === 'AI_GOVERNANCE_LEAD',
  };
}
```

### Axios Interceptor

```tsx
// api/axiosInstance.ts
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('reglens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Demo Login Function

```tsx
// utils/demoAuth.ts
const DEMO_PERSONAS = [
  { name: 'Sarah Chen',   role: 'COMPLIANCE_OFFICER',   email: 'sarah.chen@nexusbank.com',  sub: 'demo-001' },
  { name: 'James Okafor', role: 'RISK_CONTROL_MANAGER', email: 'james.okafor@nexusbank.com', sub: 'demo-002' },
  { name: 'Priya Nair',   role: 'TECHNOLOGY_LEAD',      email: 'priya.nair@nexusbank.com',  sub: 'demo-003' },
  { name: 'Marcus Webb',  role: 'AI_GOVERNANCE_LEAD',   email: 'marcus.webb@nexusbank.com', sub: 'demo-004' },
];

export function loginAsPersona(role: string) {
  const persona = DEMO_PERSONAS.find(p => p.role === role)!;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: persona.sub,
    name: persona.name,
    email: persona.email,
    'https://reglens.io/role': persona.role,
    aud: 'https://api.reglens.io',
    iss: 'https://demo.reglens.io',
    iat: now,
    exp: now + 3600,
  };
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = btoa(JSON.stringify(payload));
  const token  = `${header}.${body}.demo-signature`;
  localStorage.setItem('reglens_token', token);
}

export function logout() {
  localStorage.removeItem('reglens_token');
}
```

---

## Part 6 — Implementation Checklist

### Frontend
- [ ] Build `LoginPage` component with four persona cards (no email/password fields)
- [ ] Implement `demoAuth.ts` with `loginAsPersona()` and `logout()` functions
- [ ] Implement `useAuth()` hook that reads and decodes token from localStorage
- [ ] Implement `useRole()` hook with convenience boolean flags per role
- [ ] Add Axios interceptor that attaches `Authorization: Bearer <token>` to every request
- [ ] Add route guard: redirect to `/login` if no valid token present
- [ ] Add "Switch Persona" button in app header that calls `logout()` and redirects to `/login`
- [ ] Use `useRole()` to conditionally render nav items and action buttons

### Backend — Spring Boot Services
- [ ] Add `spring-boot-starter-oauth2-resource-server` to each Spring Boot service
- [ ] Implement custom `JwtDecoder` bean that validates demo token structure (iss, aud, exp) without external JWKS
- [ ] Implement `Auth0RoleConverter` that maps `https://reglens.io/role` claim to Spring `GrantedAuthority`
- [ ] Add `@PreAuthorize` annotations to all protected endpoints
- [ ] Return `HTTP 401` for missing/malformed token, `HTTP 403` for wrong role
- [ ] Add `/actuator/health` as a public (no-auth) endpoint

### Backend — Node/Express Services
- [ ] Implement `demoJwtMiddleware` that decodes and validates demo tokens
- [ ] Attach `req.userRole` from token claim in middleware
- [ ] Protect all routes with middleware and role checks
- [ ] Return `401` for missing token, `403` for wrong role

### API Gateway
- [ ] Configure Spring Cloud Gateway to validate JWT on all inbound routes
- [ ] Pass `Authorization` header downstream to services unchanged
- [ ] Allow `/login` and health check routes without token