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
