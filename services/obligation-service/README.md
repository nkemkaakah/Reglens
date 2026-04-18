# obligation-service

Spring Boot API for documents and obligations (Phase 1+), backed by Postgres.

## Database layout (Pattern 2)

Uses database **`reglens`** with a dedicated Postgres schema **`obligation`** for all Flyway migrations and JPA tables. Other services (for example `catalog-service`) use their own schemas in the same database.

## Local reset after schema layout changes

If you previously ran Flyway against the **`public`** schema, wipe the Docker volume once so history and tables align with `obligation`:

```bash
docker compose -f infra/docker-compose.yml down -v
```

Then start Postgres and this service again.

## Feature 4 — obligation→control/system mappings (Phase 3)

Flyway **`V4`** / **`V5`** create `obligation_to_control` and `obligation_to_system` with **foreign keys to `catalog.controls` and `catalog.systems`**. In Docker Compose, **`catalog-service` must start (and pass health) before `obligation-service`** so those tables exist when Flyway runs.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/obligations/{id}/mappings` | Public (dev SPA) |
| `POST` | `/obligations/{id}/mappings/controls` | `Authorization: Bearer <service token>` |
| `POST` | `/obligations/{id}/mappings/systems` | Same |

Request body: JSON array of objects with either `controlId` or `systemId`, optional `confidence`, `explanation`, `source`, `approvedBy`. `source` defaults to `MANUAL`; when set it must be `MANUAL` or `AI_SUGGESTED`.

Integration tests use **`src/test/resources/db/migration/V3_5__catalog_stub_for_mapping_fks.sql`** so Flyway can apply V4/V5 without running `catalog-service` in the test JVM.
