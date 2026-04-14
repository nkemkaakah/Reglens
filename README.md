# RegLens

Internal **Regulatory Change & AI Control Copilot** for Nexus Bank (portfolio / learning project). Polyglot microservices, React frontend, Postgres, Kafka, and more — added incrementally.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | React + Vite + TypeScript SPA (you scaffold this in Step 1) |
| `services/` | Backend services (Spring Boot, Node, Python) — stubs until each is implemented |
| `infra/` | `docker-compose.yml`, DB seeds, future Terraform |
| `.github/workflows/` | CI/CD workflows (later) |

## Local database (Step 1)

Postgres only:

```bash
docker compose -f infra/docker-compose.yml up -d
```

- **Database:** `reglens`
- **User / password:** `reglens` / `reglens_dev`
- **Port:** `5432`

Seed script: `infra/db/seed.sql` (runs automatically on first container init).

## Next steps

1. Scaffold the app under `frontend/`.
2. Implement `reg-ingestion-service` and first API + schema (Feature 1).
