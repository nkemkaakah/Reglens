CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE documents (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ref            TEXT        NOT NULL UNIQUE,
    title          TEXT        NOT NULL,
    regulator      TEXT        NOT NULL,
    doc_type       TEXT,
    url            TEXT,
    published_date DATE,
    effective_date DATE,
    status         TEXT        NOT NULL DEFAULT 'ACTIVE',
    topics         TEXT[],
    ingested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ingested_by    TEXT        NOT NULL DEFAULT 'system'
);
