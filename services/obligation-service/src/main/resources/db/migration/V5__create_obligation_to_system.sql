-- Feature 4 (PRD): links obligations to internal systems (microservices) impacted by the requirement.
CREATE TABLE obligation_to_system (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID         NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    system_id       UUID         NOT NULL REFERENCES catalog.systems(id) ON DELETE CASCADE,
    confidence      NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    source          TEXT         NOT NULL CHECK (source IN ('AI_SUGGESTED', 'MANUAL')),
    explanation     TEXT,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    UNIQUE (obligation_id, system_id)
);
