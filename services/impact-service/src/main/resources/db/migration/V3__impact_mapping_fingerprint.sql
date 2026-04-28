ALTER TABLE impact_analyses
    ADD COLUMN IF NOT EXISTS mapping_fingerprint TEXT;
