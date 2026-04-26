# ai-registry-service

Spring Boot API for **Feature 6 — AI system registry** (governed AI/ML/GenAI systems in Postgres, optional large governance documents in Mongo). Uses **Pattern 2**: same database `reglens` as other services, Flyway-owned schema **`ai_registry`**, with foreign keys into **`catalog`** (teams, systems, controls). Run **catalog-service** (or apply catalog migrations) before this service so cross-schema FKs succeed.


Default URL: `http://localhost:8083` (see `application.properties`).

## Docker Compose

From repo root (builds after **postgres**, **catalog-service**, and **mongodb** are up):

## Tests

`./mvnw test` starts **Testcontainers** Postgres (`postgres:16-alpine`) and Mongo (`mongo:7`). Postgres is pre-seeded via `src/test/resources/init-catalog-for-ai-registry-fk.sql` so Flyway cross-schema migrations apply without running the full catalog stack.


