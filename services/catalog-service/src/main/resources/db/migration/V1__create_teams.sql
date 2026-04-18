-- Feature 3 — domain owners / teams: who owns controls and systems in the Nexus Bank catalogue.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
