# catalog-service

Spring Boot API for the controls & systems catalogue (Phase 2).

## Database layout (Pattern 2)

Uses database **`reglens`** with a dedicated Postgres schema **`catalog`** for Flyway migrations and JPA tables. Does not share tables with `obligation-service` (that service uses schema **`obligation`**).

## Local reset

If Flyway or schema state is inconsistent during development:

```bash
docker compose -f infra/docker-compose.yml down -v
```

Then bring the stack up again.
