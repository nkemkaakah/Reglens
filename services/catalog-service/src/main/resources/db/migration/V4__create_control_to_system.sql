-- Feature 3 — which controls apply to which systems (many-to-many join used by mapping & impact UIs later).
CREATE TABLE control_to_system (
    control_id  UUID NOT NULL REFERENCES controls (id) ON DELETE CASCADE,
    system_id   UUID NOT NULL REFERENCES systems (id) ON DELETE CASCADE,
    notes       TEXT,
    PRIMARY KEY (control_id, system_id)
);
