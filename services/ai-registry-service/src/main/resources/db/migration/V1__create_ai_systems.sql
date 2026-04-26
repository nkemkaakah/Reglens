-- Feature 6 — core AI/ML/GenAI system registry: one row per governed deployment (Nexus Bank narrative).
-- Tables are created in Flyway default schema `ai_registry`; owner_team_id enforces integrity to catalogue teams in `catalog`.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE ai_systems (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref              TEXT        NOT NULL UNIQUE,
    name             TEXT        NOT NULL,
    description      TEXT,
    ai_type          TEXT        NOT NULL CHECK (ai_type IN ('ML', 'LLM', 'GENAI', 'RULE_BASED', 'HYBRID')),
    use_case         TEXT        NOT NULL,
    business_domain  TEXT,
    model_provider   TEXT,
    model_name       TEXT,
    data_sources     TEXT[],
    owner_team_id    UUID        NOT NULL REFERENCES catalog.teams (id),
    tech_lead_email  TEXT,
    risk_rating      TEXT CHECK (risk_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    deployed_at      DATE,
    last_reviewed    DATE,
    status           TEXT        NOT NULL DEFAULT 'LIVE'
                     CHECK (status IN ('LIVE', 'IN_REVIEW', 'DECOMMISSIONED', 'PROPOSED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
