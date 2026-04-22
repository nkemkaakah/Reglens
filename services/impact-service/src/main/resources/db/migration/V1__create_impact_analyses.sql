CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE impact_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID        NOT NULL UNIQUE,
    event_id        UUID        NOT NULL,
    summary         TEXT        NOT NULL,
    suggested_tasks JSONB       NOT NULL,
    generated_by    TEXT        NOT NULL,
    reviewed_by     TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
