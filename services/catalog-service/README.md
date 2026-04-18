# catalog-service

Spring Boot API for **Feature 3 — Control & system catalogue** (teams, controls, internal systems, `control_to_system` join). This is the catalogue `mapping-service` will call in later phases; obligations stay in `obligation-service`.

## Run locally

- Postgres **database** `reglens`, **schema** `catalog` (Pattern 2 — same DB as other services, isolated schema + Flyway history).
- From repo root (after `docker compose -f infra/docker-compose.yml up -d postgres`):

```bash
cd services/catalog-service && ./mvnw spring-boot:run
```

Default URL: `http://localhost:8081` (see `application.properties`).

## Docker

From repo root:

```bash
docker compose -f infra/docker-compose.yml up -d catalog-service
```

## API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/controls` | Paginated; optional `category`, `status`, `q` |
| GET | `/controls/{id}` | Includes `linkedSystems` from `control_to_system` |
| POST/PUT | `/controls`, `/controls/{id}` | Requires `Authorization: Bearer <app.security.service-token>` |
| GET | `/systems` | Paginated; optional `domain`, `criticality`, `q` |
| GET | `/systems/{id}` | Includes `linkedControls` |
| GET | `/systems/{id}/apis` | **Placeholder** — returns `[]` until `system_apis` exists |
| POST/PUT | `/systems`, `/systems/{id}` | Same bearer as writes above |

Swagger UI: `http://localhost:8081/swagger-ui.html`

## Schema / Flyway reset

If you change migrations or schema layout, reset the Postgres volume once:

`docker compose -f infra/docker-compose.yml down -v`
