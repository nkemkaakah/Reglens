# reg-ingestion-service

FastAPI service (Python 3.11+).

## Layout

- `app/main.py` — application factory and ASGI app
- `app/core/` — settings and shared core utilities
- `app/models/` — persistence/domain models
- `app/schemas/` — Pydantic schemas
- `app/api/deps.py` — FastAPI dependencies
- `app/api/routers/` — route modules; `api_router` is mounted at `/api`

## Local run

From this directory (after creating a venv and installing dependencies):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI docs: http://localhost:8000/docs
