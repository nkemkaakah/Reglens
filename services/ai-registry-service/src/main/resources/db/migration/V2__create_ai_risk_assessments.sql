-- Periodic model/AI risk assessments attached to each registered system (governance audit trail).
CREATE TABLE ai_risk_assessments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_system_id          UUID        NOT NULL REFERENCES ai_systems (id) ON DELETE CASCADE,
    assessment_date       DATE        NOT NULL,
    assessed_by           TEXT        NOT NULL,
    overall_rating        TEXT        NOT NULL CHECK (overall_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    bias_risk             TEXT,
    explainability_risk   TEXT,
    data_quality_risk     TEXT,
    operational_risk      TEXT,
    notes                 TEXT,
    next_review_date      DATE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
