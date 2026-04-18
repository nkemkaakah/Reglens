-- Feature 3 — risk/compliance control library (mapping targets for Feature 4).
CREATE TABLE controls (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref               TEXT NOT NULL UNIQUE,
    category          TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    evidence_type     TEXT,
    review_frequency  TEXT,
    owner_team_id     UUID REFERENCES teams (id),
    status            TEXT NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'DEPRECATED')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
