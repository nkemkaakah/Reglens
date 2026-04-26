-- Links each AI system to catalogue controls and internal systems (cross-schema FKs to `catalog`).
CREATE TABLE ai_system_to_control (
    ai_system_id UUID NOT NULL REFERENCES ai_systems (id) ON DELETE CASCADE,
    control_id   UUID NOT NULL REFERENCES catalog.controls (id) ON DELETE CASCADE,
    notes        TEXT,
    PRIMARY KEY (ai_system_id, control_id)
);

CREATE TABLE ai_system_to_system (
    ai_system_id UUID NOT NULL REFERENCES ai_systems (id) ON DELETE CASCADE,
    system_id    UUID NOT NULL REFERENCES catalog.systems (id) ON DELETE CASCADE,
    relationship TEXT,
    PRIMARY KEY (ai_system_id, system_id)
);
