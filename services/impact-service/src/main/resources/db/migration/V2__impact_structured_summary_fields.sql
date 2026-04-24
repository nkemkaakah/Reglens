-- Structured scan fields at analysis level (PRD Feature 5 refinement).
ALTER TABLE impact_analyses
    ADD COLUMN IF NOT EXISTS key_engineering_impacts JSONB;

ALTER TABLE impact_analyses
    ADD COLUMN IF NOT EXISTS compliance_gap TEXT;
