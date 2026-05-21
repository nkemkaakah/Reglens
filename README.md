# RegLens

**Regulatory Change & AI Control Copilot for UK Banks.**

RegLens is a full-stack portfolio project that models how a mid-sized UK bank (Nexus Bank) could manage the end-to-end regulatory change lifecycle — from ingesting FCA and PRA publications, to extracting discrete obligations, mapping them to internal controls and AI systems, assessing impact, and maintaining a fully auditable compliance record.

Built to demonstrate a realistic, production-shaped microservices architecture across Java, Node.js, Python, React, PostgreSQL, MongoDB, Redis, and Apache Kafka.

---

## What it does

| Stage | Capability |
|---|---|
| **Ingest** | Upload regulatory PDFs or URLs (FCA, PRA, Bank of England). Source metadata preserved. |
| **Extract** | LLM pipeline (Claude) reads documents and extracts structured obligations. |
| **Map** | AI suggests which internal controls and systems each obligation applies to. Analysts approve or reject. |
| **Impact** | When a mapping is approved, an impact analysis is auto-generated — affected controls, system tasks, engineering backlog. |
| **Audit** | Every decision is captured in an append-only event log. Full traceability for regulators. |
| **AI Registry** | A structured register of deployed AI systems, each linked to the obligations that govern them. |

---

## Architecture

### Services

| Service | Language / Runtime | Port | Role |
|---|---|---|---|
| `api-gateway` | Java 21 · Spring Cloud Gateway | **8090** | Single entry point. Routes all frontend traffic to upstream services. |
| `obligation-service` | Java 21 · Spring Boot | **8080** | Core domain. Manages documents, obligations, and obligation→control/system mappings. |
| `catalog-service` | Java 21 · Spring Boot | **8081** | Controls and systems catalogue. Owns teams, controls, systems, and their relationships. |
| `reg-ingestion-service` | Python 3.11 · FastAPI | **8000** | Handles document uploads. Runs the Claude extraction pipeline. Publishes to Kafka. |
| `reg-ingestion-worker` | Python 3.11 | — | Async Kafka consumer. Processes ingestion jobs in the background. |
| `mapping-service` | Node.js 20 · TypeScript / Express | **3000** | Calls Claude to suggest obligation→control/system mappings. Manages the approval work queue. |
| `impact-service` | Java 21 · Spring Boot | **8082** | Consumes `obligation.mapped` events. Generates engineering impact analyses via Claude. |
| `ai-registry-service` | Java 21 · Spring Boot | **8083** | AI system governance register. Risk assessments and lifecycle tracking. |
| `workflow-service` | Java 21 · Spring Boot | **8084** | Audit trail. Consumes all Kafka events and writes an append-only timeline to MongoDB. |
| `notification-service` | Node.js 20 · TypeScript / Express | **3001** | In-app notifications. Consumes Kafka events and surfaces them to the frontend. |

### Frontend

| | |
|---|---|
| Framework | React 19 + TypeScript + Vite + Tailwind CSS |
| Port | **5173** (dev) |
| Routing | React Router v7 |
| State | TanStack Query |
| API | All requests proxied through the API Gateway at `localhost:8090` |

### Infrastructure

| Component | Version | Port | Purpose |
|---|---|---|---|
| PostgreSQL | 16 | 5432 | Primary relational store. Shared `reglens` database, per-service schemas. |
| Apache Kafka | 3.9 (KRaft) | 9092 (internal) · 9094 (host) | Event backbone between services. |
| MongoDB | 7 | 27017 | Workflow audit log, notifications, AI registry documents. |
| Redis | 7 | 6379 | Ephemeral cache and optional notification state. |

---

## Repository layout

```
RegLens/
├── frontend/                  # React SPA
├── services/
│   ├── obligation-service/    # Java / Spring Boot
│   ├── catalog-service/       # Java / Spring Boot
│   ├── reg-ingestion-service/ # Python / FastAPI
│   ├── mapping-service/       # Node.js / TypeScript
│   ├── impact-service/        # Java / Spring Boot
│   ├── ai-registry-service/   # Java / Spring Boot
│   ├── workflow-service/       # Java / Spring Boot
│   ├── api-gateway/           # Java / Spring Cloud Gateway
│   └── notification-service/  # Node.js / TypeScript
├── infra/
│   └── docker-compose.yml     # Full stack orchestration
├── schema-blueprint.sql       # Reference schema (not a startup script)
├── .env.example               # Root environment variables
└── .github/workflows/         # CI pipelines
```

---

## Prerequisites

- [Docker](https://www.docker.com/) + Docker Compose
- [Node.js 20+](https://nodejs.org/) — for running the frontend locally
- [Java 21](https://adoptium.net/) — for running Spring Boot services locally
- [Python 3.11+](https://www.python.org/) — for running ingestion service locally
- An [Anthropic API key](https://console.anthropic.com/) — required for LLM features (mapping suggestions, impact generation)

---

## Environment variables

Create a `.env` file at the repo root (copy from `.env.example`):

```bash
cp .env.example .env
```

```env
# Required — used by mapping-service, impact-service, reg-ingestion-service
ANTHROPIC_API_KEY=sk-ant-...
```

Create the frontend env file:

```bash
cp frontend/.env.example frontend/.env
```

```env
# All API calls route through the gateway
VITE_API_GATEWAY_URL=http://localhost:8090

# Optional: override individual service URLs (bypasses gateway)
VITE_OBLIGATION_API_URL=http://localhost:8080
VITE_INGESTION_API_URL=http://localhost:8000
VITE_MAPPING_API_URL=http://localhost:3000
VITE_NOTIFICATION_API_URL=http://localhost:3001

# Your name — appears in the audit trail
VITE_REGLENS_APPROVER=your-name
```

All other service-to-service environment variables (database URLs, Kafka brokers, inter-service base URLs, auth tokens) are pre-configured in `infra/docker-compose.yml` for local use. The defaults are:

| Variable | Default |
|---|---|
| Postgres user / password | `reglens` / `reglens_dev` |
| Postgres database | `reglens` |
| Inter-service auth token | `dev-service-token-change-me` |
| Kafka (internal) | `kafka:9092` |
| Kafka (host) | `localhost:9094` |

---

## Running with Docker (recommended)

This brings up every service plus all infrastructure in one command:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Then start the frontend dev server:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To stop everything:

```bash
docker compose -f infra/docker-compose.yml down
```

To stop and wipe all volumes (full reset):

```bash
docker compose -f infra/docker-compose.yml down -v
```

---

## Building containers individually

Each service has its own `Dockerfile` using a multi-stage build.

**Java services (Spring Boot):**
```bash
cd services/obligation-service
docker build -t reglens/obligation-service .
```

**Node.js services:**
```bash
cd services/mapping-service
docker build -t reglens/mapping-service .
```

**Python service:**
```bash
cd services/reg-ingestion-service
docker build -t reglens/reg-ingestion-service .
```

---

## Running services locally (without Docker)

### Infrastructure only

Bring up just Postgres, Kafka, MongoDB, and Redis:

```bash
docker compose -f infra/docker-compose.yml up -d postgres kafka mongodb redis
```

### Spring Boot services

```bash
cd services/obligation-service
./mvnw spring-boot:run
```

Set the following environment variables (or export them) to point at the local infra:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/reglens?currentSchema=obligation
export SPRING_DATASOURCE_USERNAME=reglens
export SPRING_DATASOURCE_PASSWORD=reglens_dev
export SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9094
export APP_SECURITY_SERVICE_TOKEN=dev-service-token-change-me
```

Repeat for each Java service, substituting the correct schema name (`catalog`, `impact`, `ai_registry`) and port.

### Node.js services

```bash
cd services/mapping-service
npm install
npm run dev
```

### Python ingestion service

```bash
cd services/reg-ingestion-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Database migrations and seeding

RegLens uses **Flyway** for schema management. Migrations run automatically when each Spring Boot service starts — no manual step required.

Each service owns its schema independently:

| Service | Postgres schema | Flyway history table |
|---|---|---|
| `obligation-service` | `obligation` | `obligation.flyway_schema_history` |
| `catalog-service` | `catalog` | `catalog.flyway_schema_history` |
| `impact-service` | `impact` | `impact.flyway_schema_history` |
| `ai-registry-service` | `ai_registry` | `ai_registry.flyway_schema_history` |

Migration files live at `services/<name>/src/main/resources/db/migration/`.

**Seed data** is included in the migrations themselves (e.g. `V3__seed_obligations.sql` in `obligation-service`). Starting the services for the first time creates and seeds the full Nexus Bank demo dataset — controls, systems, teams, and sample obligations — automatically.

> `schema-blueprint.sql` at the repo root is a design reference only. It is not run on startup.

**Full reset** (wipe and re-seed from scratch):

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
```

---

## Kafka topics

Kafka runs in KRaft mode and auto-creates topics on first publish.

| Topic | Producer | Consumers |
|---|---|---|
| `document.ingest.requested` | frontend / API | `reg-ingestion-worker` |
| `document.ingested` | `reg-ingestion-service` | `workflow-service`, `notification-service` |
| `mapping.suggested` | `mapping-service` | `notification-service` |
| `obligation.mapped` | `mapping-service` | `impact-service`, `workflow-service`, `notification-service` |
| `impact.generated` | `impact-service` | `workflow-service`, `notification-service` |
| `ai_system.lifecycle` | `ai-registry-service` | `workflow-service`, `notification-service` |

To inspect topics and messages (from host):

```bash
# List topics
docker exec -it infra-kafka-1 kafka-topics.sh --bootstrap-server localhost:9092 --list

# Tail a topic
docker exec -it infra-kafka-1 kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic obligation.mapped \
  --from-beginning
```

---

## CI

GitHub Actions pipelines live in `.github/workflows/`.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci-backend.yml` | PR / push to `main` on `services/**` | Runs tests across all services in a matrix (Maven for Java, npm build for Node, pytest for Python) |

---

## Tech stack at a glance

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router v7 |
| Backend (Java) | Java 21, Spring Boot 3.5, Spring Cloud Gateway, Spring Data JPA, Flyway |
| Backend (Node) | Node.js 20, TypeScript, Express, `@anthropic-ai/sdk` |
| Backend (Python) | Python 3.11, FastAPI, uvicorn, `anthropic` |
| Databases | PostgreSQL 16, MongoDB 7, Redis 7 |
| Messaging | Apache Kafka 3.9 (KRaft) |
| LLM | Anthropic Claude (mapping suggestions, obligation extraction, impact generation) |
| Containers | Docker multi-stage builds, Docker Compose |
| CI | GitHub Actions |
