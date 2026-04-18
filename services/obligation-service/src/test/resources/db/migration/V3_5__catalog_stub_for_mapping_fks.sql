-- Integration tests run obligation-service Flyway against an isolated Postgres without catalog-service.
-- Minimal catalog schema + rows satisfy V4/V5 cross-schema FKs (production gets real tables from catalog-service).
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.controls (
    id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS catalog.systems (
    id UUID PRIMARY KEY
);

INSERT INTO catalog.controls (id) VALUES ('c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog.systems (id) VALUES ('b1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
