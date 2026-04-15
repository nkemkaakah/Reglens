CREATE TABLE obligations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id    UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ref            TEXT        NOT NULL UNIQUE,
    title          TEXT        NOT NULL,
    summary        TEXT        NOT NULL,
    full_text      TEXT        NOT NULL,
    section_ref    TEXT,
    topics         TEXT[],
    ai_principles  TEXT[],
    risk_rating    TEXT        CHECK (risk_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    effective_date DATE,
    status         TEXT        NOT NULL DEFAULT 'UNMAPPED'
                               CHECK (status IN ('UNMAPPED','IN_PROGRESS','MAPPED','IMPLEMENTED')),
    triaged_by     TEXT,
    triaged_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
