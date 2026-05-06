Here’s a clear PRD-style outline for the **Nexus Bank Regulatory Change & AI Control Copilot** that fits the “almost production‑ready” bar you described.

---

## **Product Overview**

Nexus Bank is a fictional mid‑size UK bank that increasingly uses AI and machine learning across fraud, credit risk and customer service. Regulators like the FCA, PRA and Bank of England are publishing frequent updates and AI guidance, and Nexus Bank needs a better way to keep its policies, controls and systems aligned with these rules.hoganlovells+1

The **Regulatory Change & AI Control Copilot** is an internal platform that:

- Ingests regulatory and policy documents.  
- Breaks them into structured “obligations”.  
- Uses GenAI to suggest how each obligation maps to Nexus Bank’s controls and systems.  
- Generates impact analyses and engineering backlogs.  
- Maintains an auditable history of decisions.

It is built as a realistic, cloud‑ready microservice system using Java/Spring Boot, TypeScript/React, Node/Express, Python, Kafka, SQL and NoSQL databases, containerised and deployable on AWS ECS.

---

## **Problem Statement & Goals**

## **Current state**

Today, banks manage regulatory change mostly with **manual processes, emails, spreadsheets and unstructured documents**, even as requirements and AI‑related expectations multiply. Mapping each new rule or AI principle to concrete internal controls and systems is slow, error‑prone and hard to audit.finreg-e+4

## **Core problems to solve**

1. **Information overload** – too many regulatory documents and internal policies to read and track manually.
2. **Mapping gap** – difficult to connect a paragraph in a regulation to specific controls, services and tests.
3. **Poor auditability** – hard to reconstruct “what we changed in response to regulation X” months or years later.
4. **AI governance pressure** – regulators expect explainable, well‑governed AI usage but banks lack tools that link AI systems to obligations and controls.dlapiper+2

## **Goals for the MVP**

- Give Nexus Bank a **single place to explore obligations, controls and AI systems**, with relationships visible.  
- Use GenAI to **accelerate**, not replace, expert judgement in mapping and impact analysis.  
- Provide a **traceable workflow** from regulation ingestion to implemented changes.  
- Demonstrate a **production‑style architecture** and engineering practices suitable for a real bank.

---

## **Target Users & Personas**

1. **Regulatory / Compliance Officer (primary)**
  Tracks new FCA/PRA/BoE documents, assesses which obligations apply, and coordinates with risk and tech teams.
2. **Risk & Control Manager**
  Owns parts of the control library (e.g. model risk, data governance). Needs to see which controls and AI systems are impacted by new rules.
3. **Technology Lead / Solution Architect**
  Owns specific microservices. Needs clear, actionable impact summaries and suggested technical changes.
4. **Model Risk / AI Governance Lead**
  Oversees AI/ML/GenAI use in the bank. Needs visibility over where AI is used and how each deployment aligns with principles and regulations.

---

## **MVP Scope & Features (High Level)**

1. Regulatory Ingestion & Obligation Extraction
2. Obligation Explorer & Search
3. Control & System Catalogue (seeded Nexus Bank data)
4. AI‑assisted Mapping (Obligations → Controls & Systems)
5. Impact Analysis & Engineering Backlog Generator
6. AI System Registry & Governance View
7. Workflow & Audit Trail (Reg‑change lifecycle)
8. Notifications & Event Stream (Kafka backbone)

Below, each feature includes: description, how it works, and front/back/db requirements.

---

## **Feature 1 – Regulatory Ingestion & Obligation Extraction**

## **Description & problem**

This feature ingests regulatory and internal policy documents (PDF/HTML) and breaks them into **structured obligations**: small, tagged units that describe a specific requirement. It tackles **information overload** by turning long PDFs into searchable, linkable objects.canarie+1

## **How it works (flow)**

1. Compliance uploads a document (e.g. FCA AI Update PDF) or pastes a URL.
2. A Python FastAPI service calls a document‑processing pipeline: chunking, classification, and GenAI summarisation.
3. Each chunk becomes an “obligation” with fields like `title`, `source`, `section_ref`, `summary`, `full_text`, `topics`, `ai_principles`.
4. Obligations are stored in a relational DB plus a vector index for semantic search.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React/TypeScript “Regulation Ingestion” page: file/URL upload, progress indicator, and a preview list of extracted obligations. Simple forms with validation and error messages.                                    |
| Backend  | Python FastAPI `reg-ingestion-service` handling uploads; uses LangChain or similar with an LLM (Claude/OpenAI) for chunking summarisation; exposes REST APIs: `POST /documents`, `GET /documents/{id}/obligations`. |
| Database | Postgres table `documents` and `obligations` (with foreign key); pgvector extension or separate vector DB (e.g. Qdrant) to store embeddings for semantic search.                                                    |


---

## **Feature 2 – Obligation Explorer & Search**

## **Description & problem**

A UI for browsing, filtering and searching obligations by regulator, topic, AI principle, risk level and status. It reduces **search and triage time** when a new paper lands.

## **How it works**

- React front‑end calls a Spring Boot `obligation-service` to fetch paginated obligations.  
- Users can filter by tags, date, status (unmapped / in‑progress / implemented).  
- Clicking an obligation shows details and its current mappings and workflow status.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React/TypeScript page with filters, search bar (full‑text semantic suggestions), table of obligations, and detail drawer with full text and tags.                                     |
| Backend  | Java/Spring Boot `obligation-service` providing REST endpoints: `GET /obligations`, `GET /obligations/{id}`, filter params, security via JWT. Uses JPA/Hibernate to talk to Postgres. |
| Database | Reuses `obligations` table. Additional columns for `status`, `risk_rating`, `created_by`. Optional Redis cache for popular queries.                                                   |


---

## **Feature 3 – Control & System Catalogue (Nexus Bank model)**

## **Description & problem**

Central catalogue of **controls** (risk/compliance controls) and **systems/APIs** (microservices, data stores). It gives a structured home for the mappings, solving part of the **mapping gap**.

## **How it works**

- Risk managers maintain a library of controls: IDs, descriptions, owners, evidence type.  
- Tech leads maintain a catalogue of systems/APIs with metadata (stack, team, domain, links to repos).  
- This seeded data simulates Nexus Bank having already partially integrated with the platform.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React pages for “Controls” and “Systems”: list, view, simple create/edit modals (with role‑based access later). Each page shows related obligations and AI systems. |
| Backend  | Spring Boot `catalog-service` with domain‑driven design: `Control`, `System`, `DomainOwner` aggregates. REST endpoints: `/controls`, `/systems`.                    |
| Database | Postgres tables: `controls`, `systems`, `system_apis` (for specific endpoints), `control_to_system` join table. Seed SQL scripts for Nexus Bank sample data.        |


---

## **Feature 4 – AI‑assisted Mapping (Obligations → Controls & Systems)**

## **Description & problem**

Uses GenAI to propose **which controls and systems** are likely impacted by an obligation, with human review. This directly addresses the hardest manual step: mapping regulatory text to internal reality.diligent+2

## **How it works**

1. User opens an obligation and clicks “Suggest mappings”.
2. A Node.js/Express  TypeScript `mapping-service` calls:
  - the embeddings index for nearest controls/systems;  
  - an LLM with a prompt containing the obligation text, candidate controls/systems and Nexus Bank context.
3. The LLM returns ranked suggestions with explanation text.
4. UI presents suggestions; user accepts/rejects/edits them.
5. Approved mappings are saved and an event is published to Kafka (`obligation.mapped`).

## **Requirements**


| Aspect   | Requirements                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React “Mapping” panel under obligation details: show suggested controls/systems with confidence and explanation, plus buttons for Accept/Reject/Edit. Display final mappings clearly.                                     |
| Backend  | TypeScript/Express `mapping-service` with endpoints: `POST /obligations/{id}/suggest-mappings`, `POST /obligations/{id}/mappings`. Integrates with LLM API and catalog-service. Emits Kafka events via node‑kafka client. |
| Database | `obligation_to_control` and `obligation_to_system` tables in Postgres; store suggestion metadata (source, confidence, explanation). Optionally a MongoDB collection for raw LLM responses for later analysis.             |


---

## **Feature 5 – Impact Analysis & Engineering Backlog Generator**

## **Description & problem**

For each obligation, generate a concise **impact summary** and suggested **engineering tasks** (stories) for affected systems. This bridges business/legal language and developer backlogs.

## **How it works**

1. When mappings are approved, the `impact-service` (Spring Boot) listens to Kafka events (`obligation.mapped`).
2. It retrieves obligation  controls  systems data, and calls an LLM with templates for:
  - summary for devs,  
  - per‑system change suggestions,  
  - testing implications.
3. The result is stored as `ImpactAnalysis` records.
4. UI shows a “Dev View” with generated tasks that could be copied into Jira/GitHub issues.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React “Impact” tab: textual summary, per‑system change list, tags (breaking / config-only / docs-only), and “Copy as ticket” buttons.                                            |
| Backend  | Spring Boot `impact-service` consuming Kafka; REST `GET /obligations/{id}/impact`. Uses Java HTTP client to call GenAI API. Idempotent processing (re‑runs on updated mappings). |
| Database | Postgres table `impact_analyses` with JSONB column holding per‑system suggested tasks. Foreign keys to obligations and systems.                                                  |


---

## **Feature 6 – AI System Registry & Governance View**

## **Description & problem**

Registry of all Nexus Bank AI/ML/GenAI systems with links to obligations and controls. This answers “Where do we use AI and how is each deployment governed?” – a key regulator question.fca.org+2

## **How it works**

- Risk/AI governance team registers each AI system: description, type (ML/GenAI), business purpose, data sources, owners, risk rating, linked controls and systems.  
- The platform shows for each AI system: related obligations, controls, pending changes and impact analyses.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React “AI Registry” view: cards or table for AI systems, filters by domain/risk, detail page with governance info, linked controls/obligations/impact.        |
| Backend  | Spring Boot `ai-registry-service` with entities `AiSystem`, `AiUseCase`, `AiRiskAssessment`. REST APIs `/ai-systems`.                                         |
| Database | Postgres tables: `ai_systems`, `ai_system_to_control`, `ai_system_to_system`, `ai_risk_assessments`. Optional MongoDB for storing larger documentation blobs. |


---

## **Feature 7 – Workflow & Audit Trail**

## **Description & problem**

Tracks the **lifecycle** of each obligation (and related AI mappings) from “ingested” through “implemented”, and logs user and AI actions. This solves the **auditability and accountability** problem.wolterskluwer+2

## **How it works**

- Each major action (obligation created, mapping suggested, mapping approved, impact generated, task marked done) emits a Kafka event.  
- A `workflow-service` listens to these events and stores them as an append‑only event log.  
- UI presents a timeline per obligation and per AI system.

## **Requirements**


| Aspect   | Requirements                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend | React “Timeline” component on obligation and AI system pages, showing chronological events with filters (e.g. only approvals).                                     |
| Backend  | Spring Boot `workflow-service` consuming Kafka; API `GET /obligations/{id}/events`, `GET /ai-systems/{id}/events`.                                                 |
| Database | MongoDB collection `events` (good fit for append‑only, schemaless events) plus Postgres summary columns (`status`, `last_updated`) denormalised for quick queries. |


---

## **Feature 8 – Notifications & Event Stream**

## **Description & problem**

Cross‑cutting use of **Kafka** as a backbone to decouple services and make the system “feel alive”, and optional notifications (e.g. “new high‑priority AI obligation added”).

## **How it works**

- Services publish domain events (`document.ingested`, `obligation.mapped`, `impact.generated`, `task.completed`).  
- A small `notification-service` (Node/Express or Python) consumes interesting events and sends in‑app notifications (for the UI) or emails in future.

## **Requirements**


| Aspect   | Requirements                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | Notification bell in React header, list of unread notifications with deep links.                                                   |
| Backend  | Lightweight notification service subscribing to Kafka topics, storing notifications in Redis/Mongo, exposing `GET /notifications`. |
| Database | MongoDB or Redis for notifications; Kafka for event transport.                                                                     |


---

## **Recommended Tech Stack & Architecture**

## **Overall architecture**

A **polyglot microservice architecture**, containerised with Docker and deployable to AWS ECS Fargate.

- **API Gateway**: Spring Cloud Gateway (Java) for routing, auth and rate‑limiting.  
- **Backend services (Java / Spring Boot)**  
  - `obligation-service`  
  - `catalog-service`  
  - `impact-service`  
  - `ai-registry-service`  
  - `workflow-service`
- **Backend services (Node/TypeScript)**  
  - `mapping-service` (LLM orchestration, candidate matching)  
  - `notification-service` (optional)
- **Backend services (Python)**  
  - `reg-ingestion-service` (document processing, embeddings)  
  - optional small analytics jobs (schedule re‑analysis, embedding refresh).

This mix demonstrates you can design and operate **polyglot microservices** while still keeping clear boundaries.

## **Frontend**

- **React  TypeScript SPA**, built with Vite or Create React App.  
- Component library: Material UI or Chakra for productivity.  
- Authentication via JWT (mocked auth service or integration with Keycloak / Cognito later).

## **Data Stores**

- **Postgres** (primary relational store)  
  - Core entities: obligations, documents, controls, systems, mappings, AI systems, impact analyses.  
  - Use as a stand‑in for enterprise SQL DBs (Oracle/SQL Server), but you can also spin up a SQL Server container for one microservice if you want to show familiarity.
- **MongoDB** (NoSQL)  
  - Event log (`events`), notification documents, large LLM responses.  
  - Demonstrates working with document stores.
- **Redis** (optional)  
  - Caching frequent queries and storing ephemeral notifications.
- **Vector Store**  
  - pgvector in Postgres or Qdrant as a separate service, to store text embeddings for semantic search and mapping suggestions.

## **Messaging & Integration**

- **Kafka**  
  - One cluster with topics for `regulation.documents`, `obligations.events`, `mappings.events`, `impact.events`, `workflow.events`.  
  - Spring Kafka for Java services; node‑kafka or KafkaJS for Node; confluent‑kafka‑python for Python.

## **Cloud & Infrastructure (AWS, ECS)**

- **Containerisation**: Every service and DB in its own Docker image; local environment orchestrated with `docker-compose`.  
- **AWS** (design  optional light implementation):  
  - ECS Fargate for service deployment.  
  - RDS Postgres for the relational DB.  
  - MSK (Managed Streaming for Apache Kafka) or Confluent Cloud for Kafka (Confluent Cloud is acceptable for low-cost short demos).  
  - S3 for document storage (uploaded PDFs).  
  - CloudWatch for logs/metrics (described, not fully implemented if out of scope).
  - Terraform in `/infra` as the source of truth for reproducible environment creation and teardown.

**Deployment approach for a side project (cost-aware):**

- Run AWS as a **short-lived environment** for learning/demo purposes.
- Deploy for 1–2 days, validate end-to-end flows, and capture demo evidence.
- Destroy infrastructure immediately after with `terraform destroy` to avoid recurring cost.
- Keep IaC and pipelines in-repo so operational capability remains demonstrable without paying for always-on infra.

---

## **CI/CD Pipeline Recommendation (GitHub Actions)**

You want to show you can work **locally and in “production”**.

## **1 Repository structure**

Monorepo with top‑level folders:

- `/frontend`  
- `/services/reg-ingestion-service` (Python)  
- `/services/obligation-service` (Spring Boot)  
- `/services/catalog-service` (Spring Boot)  
- `/services/mapping-service` (Node/TS)  
- `/services/impact-service` (Spring Boot)  
- `/services/ai-registry-service` (Spring Boot)  
- `/services/workflow-service` (Spring Boot)  
- `/services/notification-service` (Node/TS)  
- `/infra` (docker-compose, Terraform stubs for AWS ECS/RDS/MSK)

## **2 GitHub Actions workflows**

**a) `ci-backend.yml`**

Triggered on pull requests and pushes to `main`:

- Matrix over services (Java, Node, Python).  
- Steps per service:  
  - Checkout code.  
  - Set up JDK/Node/Python as needed.  
  - `mvn test` or `npm test` or `pytest` for unit  integration tests (Testcontainers for DB/Kafka).  
  - Build JAR or Node/Python artifact.

**b) `ci-frontend.yml`**

- Lint (`eslint`), type‑check (`tsc`), run unit tests (Jest), and build production bundle.

**c) `docker-build-and-push.yml`**

On merge to `main` and tags:

- Build Docker images for each service.  
- Tag with commit SHA and `latest`.  
- Push to GitHub Container Registry or ECR (via GitHub OIDC).

**d) `deploy-ecs-staging.yml`**

- Triggered on tags like `v`*.  
- Uses AWS credentials via OIDC.  
- Runs `terraform apply` for the staging stack and updates ECS services with new image tags.  
- Runs a simple smoke test (e.g. call `/health` on gateway).

**e) `destroy-ecs-staging.yml` (cost-control companion)**

- Manually triggered after demo/learning window.
- Uses AWS credentials via OIDC.
- Runs `terraform destroy` for the same staging workspace to remove paid resources.
- Persists deployment logs/artifacts in GitHub Actions for auditability.

## **3 Local development**

- `docker-compose up` spins up Kafka, Postgres, MongoDB, and all services in “dev” mode.  
- Devs can run individual services directly from their IDE (Spring Boot, Node, Python) while still talking to local containers.  
- README explains how to run:  
  - “API only” mode (backend  DB  Kafka).  
  - “End‑to‑end” mode (backend  frontend).

---

This PRD gives you:

- A **clear story** about what Nexus Bank’s copilot solves and for whom.  
- A **concrete feature set** tied to specific pain points in real financial regulation and AI governance.hoganlovells+3  
- A **deliberately rich tech stack** that showcases Spring Boot, TypeScript/React, Node/Express, Python, SQL, NoSQL, Kafka, Docker, and an AWS/ECS‑ready architecture.  
- A **professional CI/CD plan** that looks like what real teams actually run.

If you want, next step I can turn this into a Markdown PRD file you can drop straight into your repo.

## **Design System & Colour Scheme**

RegLens uses a minimalist, professional aesthetic suited to an internal compliance and risk platform. The design language prioritises clarity, data density and trust — avoiding anything that looks decorative or consumer-app-like.

---

## **Principles**

- Restrained by default. The UI should feel calm and structured. Colour is used purposefully to signal status, not decoration.  
- Dark and light modes both feel native. Neither mode is an afterthought. Both use the same accent colours.  
- Semantic colour usage. Blue  informational/action, Green  success/compliant, Red  risk/attention, Amber  warning/pending. Users should not need a legend to understand what a colour means.

---

## **Colour Palette**

## **Neutrals (base of both modes)**


| Role                          | Light Mode                            | Dark Mode                            |
| ----------------------------- | ------------------------------------- | ------------------------------------ |
| Background (primary)          | F5F5F5 — off-white, never stark white | 1A1A1A — soft black, not pitch black |
| Background (surface / cards)  | FFFFFF                                | 242424                               |
| Background (subtle / sidebar) | EFEFEF                                | 2E2E2E                               |
| Border / divider              | DCDCDC                                | 3A3A3A                               |
| Text (primary)                | 1A1A1A                                | F0F0F0                               |
| Text (secondary / muted)      | 6B6B6B                                | 9A9A9A                               |
| Text (disabled)               | BCBCBC                                | 555555                               |


---

## **Accent Colours (same in both modes)**


| Role                              | Colour      | Hex             | When to use                                                 |
| --------------------------------- | ----------- | --------------- | ----------------------------------------------------------- |
| Primary action / links            | Slate Blue  | 3B6FD4          | Buttons, links, selected nav items, active filters          |
| Primary action hover              | Deeper Blue | 2D57B0          | Hover/focus state on primary elements                       |
| Success / Compliant / Implemented | Muted Green | 2E9E68          | Status badges: "Implemented", "Mapped", "Compliant"         |
| Success background tint           | Light Green | EAF7F1 / 1A3D2D | Row highlight, toast background                             |
| Risk / High Priority / Alert      | Muted Red   | D94F4F          | Status: "High Risk", "Breach Risk", error states            |
| Risk background tint              | Light Red   | FDF1F1 / 3D1A1A | Risk badges, error banners                                  |
| Warning / Pending / In Progress   | Amber       | C98A1A          | Status: "In Progress", "Unmapped", "Pending Review"         |
| Warning background tint           | Light Amber | FDF5E6 / 3D2C0E | Pending state rows, warning toasts                          |
| AI-generated content marker       | Soft Violet | 7B5EA7          | Label/tag to mark content suggested by AI vs human-approved |


---

## **Status Badge Reference (used across the product)**


| Status         | Colour             |
| -------------- | ------------------ |
| Ingested       | Slate Blue 3B6FD4  |
| Unmapped       | Amber C98A1A       |
| In Progress    | Amber C98A1A       |
| Mapped         | Muted Green 2E9E68 |
| Implemented    | Muted Green 2E9E68 |
| High Risk      | Muted Red D94F4F   |
| AI Suggested   | Soft Violet 7B5EA7 |
| Human Approved | Muted Green 2E9E68 |


---

## **Typography**

- Font family: Inter (system-standard, clean, widely used in enterprise tools).  
- Scale: Use a simple 4-level heading scale — H1 for page titles, H2 for sections, H3 for cards/panels, H4 for labels.  
- Body text size: 14px base (dense, professional; not 16px which feels consumer-app).  
- Monospace (for obligation IDs, obligation references, JSON, code snippets): JetBrains Mono or Fira Code.

---

## **Component Style Notes**

- Buttons: Rounded corners (border-radius: 6px), not fully pill-shaped. Primary  solid Slate Blue. Secondary  outlined. Destructive  solid Muted Red.  
- Cards/panels: Light shadow in light mode (box-shadow: 0 1px 4px rgba(0,0,0,0.08)), subtle border in dark mode. No heavy elevation effects.  
- Tables: Zebra striping using the subtle background tint. Row hover uses a slightly stronger tint.  
- Sidebar / nav: Slightly darker than the main background surface. Active item highlighted with Slate Blue left border accent.  
- AI-generated content: Always labelled with a small Soft Violet AI badge so users know when content was machine-generated vs human-reviewed. This is a deliberate design choice that signals responsible AI use.

