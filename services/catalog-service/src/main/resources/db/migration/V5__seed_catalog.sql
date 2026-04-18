-- Nexus Bank–flavoured subset (aligned with schema-blueprint.sql UUIDs for future mapping-service joins).
INSERT INTO teams (id, name, domain, email) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Model Risk & Validation', 'Risk', 'model-risk@nexusbank.com'),
    ('a1000000-0000-0000-0000-000000000002', 'Data Governance Office', 'Risk', 'data-governance@nexusbank.com'),
    ('a1000000-0000-0000-0000-000000000006', 'Credit Risk Technology', 'Technology', 'credit-tech@nexusbank.com'),
    ('a1000000-0000-0000-0000-000000000007', 'Financial Crime Technology', 'Technology', 'fc-tech@nexusbank.com'),
    ('a1000000-0000-0000-0000-000000000009', 'AI & Data Science', 'Technology', 'ai-ds@nexusbank.com');

INSERT INTO systems (id, ref, display_name, description, domain, tech_stack, repo_url, owner_team_id, criticality) VALUES
    (
        'b1000000-0000-0000-0000-000000000001',
        'credit-decision-service',
        'Credit Decision Service',
        'Core underwriting engine: rules, ML, bureau data; produces decisions with explanation payloads.',
        'Credit',
        ARRAY['Java 21', 'Spring Boot 3', 'Postgres', 'Kafka'],
        'https://github.com/nexusbank/credit-decision-service',
        'a1000000-0000-0000-0000-000000000006',
        'CRITICAL'
    ),
    (
        'b1000000-0000-0000-0000-000000000002',
        'fraud-monitoring-service',
        'Fraud Monitoring Service',
        'Real-time screening; ML fraud model; alerts and audit logging.',
        'Fraud',
        ARRAY['Java 21', 'Spring Boot 3', 'Kafka', 'Redis', 'Postgres'],
        'https://github.com/nexusbank/fraud-monitoring-service',
        'a1000000-0000-0000-0000-000000000007',
        'CRITICAL'
    ),
    (
        'b1000000-0000-0000-0000-000000000006',
        'ai-gateway-service',
        'AI Gateway Service',
        'Internal proxy for LLM calls: rate limits, prompt logging, PII scrubbing.',
        'Platform',
        ARRAY['Node.js 20', 'TypeScript', 'Redis', 'Postgres'],
        'https://github.com/nexusbank/ai-gateway-service',
        'a1000000-0000-0000-0000-000000000009',
        'CRITICAL'
    );

INSERT INTO controls (id, ref, category, title, description, evidence_type, review_frequency, owner_team_id, status) VALUES
    (
        'c1000000-0000-0000-0000-000000000001',
        'MR-01',
        'Model Risk',
        'Model Inventory Register',
        'All ML/AI/statistical models in production must be registered before deployment.',
        'Inventory extract; quarterly attestation',
        'Quarterly',
        'a1000000-0000-0000-0000-000000000001',
        'ACTIVE'
    ),
    (
        'c1000000-0000-0000-0000-000000000002',
        'MR-02',
        'Model Risk',
        'Pre-deployment Model Validation',
        'HIGH and CRITICAL models must be independently validated before production.',
        'Signed validation report',
        'Per deployment',
        'a1000000-0000-0000-0000-000000000001',
        'ACTIVE'
    ),
    (
        'c1000000-0000-0000-0000-000000000004',
        'MR-04',
        'Model Risk',
        'Decision Explainability Logging',
        'Customer-impacting model decisions must log version, features, score, threshold; 7-year retention.',
        'Log retention audit',
        'Continuous',
        'a1000000-0000-0000-0000-000000000001',
        'ACTIVE'
    ),
    (
        'c1000000-0000-0000-0000-000000000007',
        'DG-02',
        'Data Governance',
        'PII Handling in AI Pipelines',
        'PII must not feed models without lawful basis; AI Gateway scrubs prompts.',
        'DPIA register; gateway tests',
        'Annual',
        'a1000000-0000-0000-0000-000000000002',
        'ACTIVE'
    );

INSERT INTO control_to_system (control_id, system_id, notes) VALUES
    (
        'c1000000-0000-0000-0000-000000000004',
        'b1000000-0000-0000-0000-000000000001',
        'credit-decision-service logs model version, top features, score and threshold per decision'
    ),
    (
        'c1000000-0000-0000-0000-000000000004',
        'b1000000-0000-0000-0000-000000000002',
        'fraud-monitoring-service logs SHAP and decision basis per transaction'
    ),
    (
        'c1000000-0000-0000-0000-000000000007',
        'b1000000-0000-0000-0000-000000000006',
        'AI Gateway enforces PII scrubbing on all outbound LLM prompts'
    );
