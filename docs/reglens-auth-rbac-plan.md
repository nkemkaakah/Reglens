# Reglens Auth & RBAC Plan

## Overview

This document defines the authentication and role-based access control (RBAC) strategy for the Reglens Regulatory Change & AI Control Copilot. It covers how users log in, how the system knows who they are, what each role is allowed to do, and how the demo mode works for portfolio presentation purposes.

The goal is a system that feels real and production-grade — with proper identity, protected routes, and meaningful role restrictions — while remaining frictionless for anyone evaluating the product in a demo context.

---

## Part 1 — Authentication

### What We Are Using: Auth0

Authentication (proving who you are) is handled by **Auth0**, a third-party identity platform. Auth0 takes care of the login screen, password storage, token generation, and security best practices so those do not need to be built from scratch.

When a user logs in successfully, Auth0 issues a **JWT (JSON Web Token)** — a signed, tamper-proof string that contains the user's identity and role. Every request from the frontend to any backend service includes this token in the `Authorization` header. Each service validates the token before processing the request.

### How the Token Works

```
User logs in → Auth0 validates credentials → Auth0 issues JWT
                                                      ↓
Frontend stores JWT → sends it with every API request
                                                      ↓
Backend validates JWT signature → reads userId + role → allows or rejects
```

The JWT contains a custom claim — `https://reglens.io/role` — that holds the user's assigned role (e.g. `COMPLIANCE_OFFICER`). This is set in Auth0 via a Login Action (a small JavaScript hook that runs on login and stamps the role onto the token).

### Session Behaviour

- JWT access tokens expire after **1 hour**.
- Auth0 issues a refresh token that silently renews the access token in the background — users do not get logged out mid-session.
- On logout, tokens are revoked and the frontend clears its in-memory state.

---

## Part 2 — Demo Mode

### The Problem with a Real Login Wall on a Portfolio Project

When a recruiter or hiring manager opens a portfolio project and hits a login screen, most will not create an account. The friction kills the demo before it starts.

### The Solution: One-Click Persona Login

The login page shows the standard Auth0-backed email/password form, but also displays a **"Demo Mode" panel** with four pre-built persona buttons. Each button is labelled with a real name, job title, and a one-line description of what that persona cares about. Clicking any button automatically signs in as that persona — no password needed.

```
┌─────────────────────────────────────────────────────┐
│              Sign in to Reglens                     │
│                                                     │
│  [Email field]                                      │
│  [Password field]                                   │
│  [Sign In button]                                   │
│                                                     │
│  ── or explore as a demo persona ──                 │
│                                                     │
│  [ Sarah Chen · Compliance Officer               ]  │
│    Tracks new FCA/PRA obligations                   │
│                                                     │
│  [ James Okafor · Risk & Control Manager         ]  │
│    Manages the control library                      │
│                                                     │
│  [ Priya Nair · Technology Lead                  ]  │
│    Owns backend microservices                       │
│                                                     │
│  [ Marcus Webb · AI Governance Lead              ]  │
│    Oversees all AI/ML deployments                   │
└─────────────────────────────────────────────────────┘
```

Each demo persona is a real Auth0 user with a pre-set password. The frontend sends the credentials automatically — the user just clicks the button. The resulting JWT is real, signed by Auth0, and carries the correct role. The rest of the system behaves identically to a genuine login.

This approach means:
- No special "demo mode" code path in the backend — demo users are just users with roles.
- The login experience looks professional, not like a bypassed auth wall.
- Each persona shows a meaningfully different view of the product, demonstrating that RBAC is real.

---

## Part 3 — Roles & Permissions

### The Four Roles

Reglens has four roles, each mapped to one of the Nexus Bank personas. Roles are assigned in Auth0 and stamped onto the JWT. Every backend service reads the role from the token and enforces the rules below.

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

Risk & Control Managers own the control catalogue. They can edit controls and review mappings that touch their domain, but they cannot ingest new regulatory documents or manage the AI Registry.

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
**Primary concern:** Understanding which systems are impacted by regulatory changes, reviewing engineering backlog items generated by the impact analysis.

Technology Leads are consumers of the output of the compliance pipeline. They can see impact analyses and copy engineering tasks into their project management tools, but they cannot change the compliance data itself.

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
**Primary concern:** Full visibility and control over the AI System Registry — ensuring every AI deployment at Nexus Bank is properly governed, risk-rated, and linked to the relevant obligations and controls.

The AI Governance Lead has full write access to the AI Registry and read-only access everywhere else. This role is the primary user of Feature 6 (AI System Registry & Governance View).

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

Every backend service (Spring Boot Java services, Node/Express services) validates the JWT on every request. A shared middleware library extracts the role from the `https://reglens.io/role` claim and checks it against the required permission for that endpoint.

Example: `DELETE /obligations/{id}` requires `COMPLIANCE_OFFICER`. If the token carries `TECHNOLOGY_LEAD`, the service returns `HTTP 403 Forbidden` immediately, before any business logic runs.

RBAC is enforced at the **API level** — never just in the frontend. The UI hides or disables buttons based on role to improve UX, but this is a convenience, not a security measure. A user who bypassed the UI and called the API directly would still get rejected by the backend.

### Frontend Enforcement (UX Only)

The React frontend reads the role from the decoded JWT and uses it to:
- Show or hide navigation items (e.g. Technology Leads do not see the "Ingest Document" button)
- Disable action buttons on detail pages (e.g. "Approve Mapping" is disabled for read-only roles)
- Show role-appropriate empty states (e.g. "Contact your Compliance Officer to ingest a document")

This is purely for user experience. Security lives in the backend.

### API Gateway Layer

The Spring Cloud Gateway (the API Gateway that sits in front of all services) also validates the JWT before forwarding requests. This means an invalid or expired token is rejected at the gateway before it ever reaches a service.

---

## Part 5 — Implementation Checklist

### Auth0 Setup
- [ ] Create Auth0 tenant and application (Single Page Application type)
- [ ] Create four demo user accounts with pre-set passwords
- [ ] Assign roles to each demo user in Auth0
- [ ] Create a Login Action that stamps `https://reglens.io/role` onto the JWT
- [ ] Configure allowed callback URLs and logout URLs

### Backend
- [ ] Add JWT validation middleware to each Spring Boot service (using `spring-security-oauth2-resource-server`)
- [ ] Add JWT validation middleware to each Node/Express service (using `express-jwt` + `jwks-rsa`)
- [ ] Create a shared role constants file used by all services
- [ ] Annotate endpoints with required roles (Spring: `@PreAuthorize("hasRole('COMPLIANCE_OFFICER')")`)
- [ ] Return `HTTP 401` for missing/invalid token, `HTTP 403` for insufficient role

### Frontend
- [ ] Install Auth0 React SDK (`@auth0/auth0-react`)
- [ ] Wrap app in `Auth0Provider`
- [ ] Build Demo Mode login panel with four persona buttons
- [ ] Create a `useRole()` hook that returns the current user's role from the JWT
- [ ] Use `useRole()` to conditionally render action buttons and nav items
- [ ] Attach JWT to all API requests via an Axios interceptor

