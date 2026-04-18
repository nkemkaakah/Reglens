-- Feature 4 (PRD): approved / suggested links from regulatory obligations to bank control library rows.
-- FK to catalog.controls keeps catalogue ownership in catalog-service; obligation-service only stores the join.
CREATE TABLE obligation_to_control (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID         NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    control_id      UUID         NOT NULL REFERENCES catalog.controls(id) ON DELETE CASCADE,
    confidence      NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    source          TEXT         NOT NULL CHECK (source IN ('AI_SUGGESTED', 'MANUAL')),
    explanation     TEXT,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    UNIQUE (obligation_id, control_id)
);
