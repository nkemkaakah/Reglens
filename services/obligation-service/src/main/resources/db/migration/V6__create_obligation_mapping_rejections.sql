-- Audit trail when a reviewer rejects a suggested control/system mapping (Feature 4).
CREATE TABLE obligation_mapping_rejection (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id    UUID         NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    catalogue_kind   TEXT         NOT NULL CHECK (catalogue_kind IN ('control', 'system')),
    catalogue_id     UUID         NOT NULL,
    rejected_by      TEXT         NOT NULL,
    reason           TEXT,
    rejected_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_obligation_mapping_rejection_obligation ON obligation_mapping_rejection(obligation_id);
