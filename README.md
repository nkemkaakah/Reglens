# RegLens

> **AI-powered regulatory change copilot for banks.**  
> Upload a regulation. Extract obligations. Map impacted controls. Generate an audit-ready impact report. All in minutes, not weeks.

---

## The Problem

When a regulator publishes new guidance — an FCA Policy Statement, a PRA Supervisory Statement, a Basel update — a mid-sized bank faces the same brutal manual process every time:

1. Compliance teams read hundreds of pages and extract obligations by hand
2. Analysts try to figure out which internal controls and systems each obligation touches
3. Engineers wait weeks to find out what they actually need to build or change
4. All of it is tracked in spreadsheets that no regulator would ever call audit-ready

**This is how banks miss deadlines, over-engineer responses, or fail audits.**

RegLens replaces that workflow with an AI-assisted pipeline that goes from raw regulatory document to structured, mapped, impact-analysed, and fully auditable compliance record — end to end.

---

## What RegLens Does

| Stage | What happens |
|---|---|
| **Ingest** | Upload an FCA/PRA/BoE PDF or paste a URL. Source metadata is preserved. |
| **Extract** | Claude reads the document and extracts discrete, structured obligations — not a summary, but specific requirements with references. |
| **Map** | Claude suggests which internal controls and AI systems each obligation applies to. Analysts approve or reject suggestions in a work queue. |
| **Impact** | On approval, an impact analysis is auto-generated: affected controls, system-level tasks, engineering backlog items. |
| **Audit** | Every decision — suggestion, approval, rejection — is captured in an append-only event log with full traceability for regulators. |
| **AI Registry** | A structured register of deployed AI systems, each linked to the obligations that govern them — built for the era of the EU AI Act and SS1/23. |

This is not a chatbot wrapper around regulation. It is a structured compliance operations tool, built around real bank workflows.

---

## Demo

> 📹 **[Watch the demo walkthrough →](#)** *(link to Loom / YouTube)*

---

## Architecture

RegLens is built as a microservices system — not because the project required it, but to demonstrate how a production team at a real bank would actually build this. Each service owns its domain, communicates over Kafka, and is independently deployable.

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│          (TypeScript · Vite · Tailwind · TanStack Query)        │
└────────────────────────┬────────────────────────────────────────┘
                         │ all traffic
                    ┌────▼────┐
                    │   API   │
                    │ Gateway │  Java 21 · Spring Cloud Gateway
                    └────┬────┘
        ┌────────────────┼──────────────────────┐
        │                │                      │
┌───────▼──────┐  ┌──────▼──────┐  ┌───────────▼──────┐
│  obligation  │  │   catalog   │  │  reg-ingestion   │
│   service    │  │   service   │  │     service      │
│ Java · :8080 │  │ Java · :8081│  │ Python · :8000   │
└──────────────┘  └─────────────┘  └──────────────────┘
        │                │                      │
        │         ┌──────▼──────┐               │
        │         │   mapping   │               │
        │         │   service   │               │
        │         │ Node · :3000│               │
        │         └──────┬──────┘               │
        │                │                      │
        └────────────────▼──────────────────────┘
                    Apache Kafka
          ┌──────────────┬──────────────┐
   ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────────┐
   │   impact    │ │  workflow  │ │ notification  │
   │   service  │ │  service   │ │    service    │
   │ Java · :8082│ │Java · :8084│ │ Node · :3001  │
   └─────────────┘ └────────────┘ └───────────────┘
        │                │
   ┌────▼─────┐   ┌──────▼──────┐
   │ai-registry│  │  MongoDB    │
   │Java · :8083│  │ (audit log) │
   └───────────┘  └─────────────┘
```

### Services

| Service | Stack | Port | Role |
|---|---|---|---|
| `api-gateway` | Java 21 · Spring Cloud Gateway | 8090 | Single entry point. Routes all frontend traffic. |
| `obligation-service` | Java 21 · Spring Boot | 8080 | Core domain. Documents, obligations, mappings. |
| `catalog-service` | Java 21 · Spring Boot | 8081 | Controls and systems catalogue. Owns teams and their relationships. |
| `reg-ingestion-service` | Python 3.11 · FastAPI | 8000 | Document uploads. Runs the Claude extraction pipeline. Publishes to Kafka. |
| `reg-ingestion-worker` | Python 3.11 | — | Async Kafka consumer. Processes ingestion jobs in the background. |
| `mapping-service` | Node.js 20 · TypeScript | 3000 | Calls Claude to suggest obligation→control/system mappings. Manages the approval work queue. |
| `impact-service` | Java 21 · Spring Boot | 8082 | Consumes `obligation.mapped` events. Generates engineering impact analyses via Claude. |
| `ai-registry-service` | Java 21 · Spring Boot | 8083 | AI system governance register. Risk assessments, lifecycle tracking. |
| `workflow-service` | Java 21 · Spring Boot | 8084 | Audit trail. Writes an append-only event timeline to MongoDB. |
| `notification-service` | Node.js 20 · TypeScript | 3001 | In-app notifications. Consumes Kafka events and surfaces them to the UI. |

### Infrastructure

| Component | Version | Purpose |
|---|---|---|
| PostgreSQL 16 | — | Primary relational store. Per-service schemas, managed by Flyway. |
| Apache Kafka 3.9 (KRaft) | — | Event backbone between services. |
| MongoDB 7 | — | Append-only audit log, notifications, AI registry documents. |
| Redis 7 | — | Ephemeral cache and notification state. |

---

## Kafka Event Flow

```
Frontend ──► document.ingest.requested ──► reg-ingestion-worker
                                                    │
                                        document.ingested
                                                    │
                          ┌─────────────────────────┤
                          ▼                         ▼
                   workflow-service       notification-service

mapping-service ──► mapping.suggested ──► notification-service
mapping-service ──► obligation.mapped ──► impact-service
                                      └──► workflow-service
                                      └──► notification-service

impact-service ──► impact.generated ──► workflow-service
                                    └──► notification-service

ai-registry-service ──► ai_system.lifecycle ──► workflow-service
```

---

## Why AI Changes This

Regulatory change management is a document-heavy, judgment-heavy process. The compliance team at a bank receives thousands of pages a year. The bottleneck is not reading — it is structured interpretation: *what exactly is required, of which systems, by when?*

Claude is used in three places:

1. **Obligation extraction** — reads raw regulatory text and returns structured obligations with references, not a prose summary
2. **Mapping suggestions** — given an obligation, recommends which internal controls and AI systems it applies to, with confidence reasoning
3. **Impact generation** — given an approved mapping, produces a structured impact analysis including affected controls, system tasks, and engineering backlog items

The key design choice: **the analyst stays in the loop.** Claude suggests; humans approve or reject. Every decision is captured in the audit trail. This is not AI replacing compliance — it is AI accelerating compliance while keeping humans accountable.

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (frontend)
- Java 21 (Spring Boot services, if running locally)
- Python 3.11+ (ingestion service, if running locally)
- An [Anthropic API key](https://console.anthropic.com/)

### Quickstart (Docker — recommended)

```bash
# Clone the repo
git clone https://github.com/your-username/reglens.git
cd reglens

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

cp frontend/.env.example frontend/.env

# Start all services and infrastructure
docker compose -f infra/docker-compose.yml up -d

# Start the frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Seed data loads automatically on first startup — Nexus Bank demo dataset including controls, systems, teams, and sample obligations.

### Environment Variables

**`.env` (root):**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

**`frontend/.env`:**
```env
VITE_API_GATEWAY_URL=http://localhost:8090
VITE_REGLENS_APPROVER=your-name   # appears in audit trail
```

All service-to-service config (database URLs, Kafka brokers, inter-service tokens) is pre-set in `docker-compose.yml` for local development.

### Full Reset

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
```

---

## Repository Structure

```
RegLens/
├── frontend/                    # React 19 SPA
├── services/
│   ├── obligation-service/      # Java · Spring Boot
│   ├── catalog-service/         # Java · Spring Boot
│   ├── reg-ingestion-service/   # Python · FastAPI
│   ├── mapping-service/         # Node.js · TypeScript
│   ├── impact-service/          # Java · Spring Boot
│   ├── ai-registry-service/     # Java · Spring Boot
│   ├── workflow-service/        # Java · Spring Boot
│   ├── api-gateway/             # Java · Spring Cloud Gateway
│   └── notification-service/   # Node.js · TypeScript
├── infra/
│   └── docker-compose.yml       # Full stack orchestration
├── schema-blueprint.sql         # Design reference
├── .env.example
└── .github/workflows/           # CI (matrix build across all services)
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query · React Router v7 |
| Backend (Java) | Java 21 · Spring Boot 3.5 · Spring Cloud Gateway · Spring Data JPA · Flyway |
| Backend (Node) | Node.js 20 · TypeScript · Express · `@anthropic-ai/sdk` |
| Backend (Python) | Python 3.11 · FastAPI · uvicorn · `anthropic` |
| Databases | PostgreSQL 16 · MongoDB 7 · Redis 7 |
| Messaging | Apache Kafka 3.9 (KRaft) |
| AI | Anthropic Claude — obligation extraction, mapping suggestions, impact generation |
| Infrastructure | Docker multi-stage builds · Docker Compose |
| CI | GitHub Actions (matrix: Maven · npm · pytest) |

---

## Built For



RegLens demonstrates how AI can transform one of the most expensive, error-prone processes in financial services: translating regulatory publications into structured, auditable, engineering-ready compliance actions. It is not a proof of concept — it is a working prototype with a production-minded architecture, built to show what a real RegTech team could ship.

---

*Fictional bank (Nexus Bank) used throughout for demonstration purposes.*
