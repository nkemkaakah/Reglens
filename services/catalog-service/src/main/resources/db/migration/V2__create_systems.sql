-- Feature 3 — internal systems catalogue (microservices, apps) that controls will map to in later phases.
CREATE TABLE systems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref             TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    description     TEXT,
    domain          TEXT,
    tech_stack      TEXT[],
    repo_url        TEXT,
    owner_team_id   UUID REFERENCES teams (id),
    criticality     TEXT CHECK (criticality IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
