-- Nexus-style demo AI systems — UUIDs aligned with schema-blueprint.sql where possible.
-- owner_team_id and join targets must exist in catalog-service seed (teams / controls / systems).
INSERT INTO ai_systems (id, ref, name, description, ai_type, use_case, business_domain, model_provider, model_name, data_sources, owner_team_id, tech_lead_email, risk_rating, deployed_at, last_reviewed, status)
VALUES
    (
        'f1000000-0000-0000-0000-000000000001',
        'NXB-AI-001',
        'Credit Memo AI Assistant',
        'LLM-powered assistant that drafts structured credit assessment memos for relationship managers.',
        'LLM',
        'Credit underwriting memo drafting for SME and corporate credit applications',
        'Credit',
        'Anthropic',
        'claude-3-5-sonnet-20241022',
        ARRAY['credit-decision-service', 'document-intelligence-service', 'Bureau Data API (Equifax)', 'Core Banking System'],
        'a1000000-0000-0000-0000-000000000006',
        'james.achebe@nexusbank.com',
        'HIGH',
        '2024-01-15',
        '2024-10-01',
        'LIVE'
    ),
    (
        'f1000000-0000-0000-0000-000000000002',
        'NXB-AI-002',
        'Transaction Fraud Detection Model',
        'Gradient boosting ML model that scores card and payment transactions in real time for fraud risk.',
        'ML',
        'Real-time fraud detection for card transactions and faster payments',
        'Fraud',
        'In-house',
        'XGBoost 2.0 (internal)',
        ARRAY['transaction-history (internal)', 'device-fingerprint-service', 'merchant-enrichment-api', 'historical-fraud-labels (internal)'],
        'a1000000-0000-0000-0000-000000000007',
        'fatima.hassan@nexusbank.com',
        'CRITICAL',
        '2022-11-01',
        '2024-09-15',
        'LIVE'
    ),
    (
        'f1000000-0000-0000-0000-000000000003',
        'NXB-AI-003',
        'Nexus Assist — Customer Support Chatbot',
        'GenAI-powered conversational assistant embedded in mobile and internet banking.',
        'GENAI',
        'Tier-1 automated customer service — balance, transactions, disputes, FAQs',
        'Digital',
        'OpenAI',
        'gpt-4o-mini',
        ARRAY['customer-comms-service', 'Core Banking System (read-only)', 'FAQ Knowledge Base (internal)', 'Product Documentation'],
        'a1000000-0000-0000-0000-000000000009',
        'priya.nair@nexusbank.com',
        'HIGH',
        '2023-09-01',
        '2024-11-01',
        'LIVE'
    );

INSERT INTO ai_risk_assessments (ai_system_id, assessment_date, assessed_by, overall_rating, bias_risk, explainability_risk, data_quality_risk, operational_risk, notes, next_review_date)
VALUES
    (
        'f1000000-0000-0000-0000-000000000001',
        '2024-10-01',
        'Model Risk & Validation Team',
        'HIGH',
        'MEDIUM — Training data spans 2019–2024; fairness monitoring ongoing.',
        'MEDIUM — LLM rationale not fully auditable; mandatory human review before submission.',
        'LOW — Bureau and internal sources with SLAs.',
        'MEDIUM — Fallback to manual memos tested semi-annually.',
        'Human-in-the-loop mandatory before any memo is submitted.',
        '2025-10-01'
    ),
    (
        'f1000000-0000-0000-0000-000000000002',
        '2024-09-15',
        'Model Risk & Validation Team',
        'CRITICAL',
        'HIGH — Disparate impact testing on postcode proxies; remediation in progress.',
        'MEDIUM — SHAP logged per decision.',
        'MEDIUM — Third-party merchant data gaps during incidents.',
        'CRITICAL — Sub-200ms SLA; rule-based fallback when model unavailable.',
        'Bias remediation plan approved September 2024.',
        '2025-03-15'
    ),
    (
        'f1000000-0000-0000-0000-000000000003',
        '2024-11-01',
        'Model Risk & Validation Team',
        'HIGH',
        'LOW — No direct protected-characteristic decisions.',
        'HIGH — GenAI non-deterministic; quality checks and human escalation.',
        'LOW — Knowledge base version-controlled.',
        'MEDIUM — LLM provider outage disables chatbot; human path 24/7.',
        'Disclosure template live; escalation tested monthly.',
        '2025-11-01'
    );

-- Only controls present in catalog-service V5 seed: MR-01, MR-02, MR-04, DG-02.
INSERT INTO ai_system_to_control (ai_system_id, control_id, notes) VALUES
    ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Model inventory registration'),
    ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'MR-02: Pre-deployment validation'),
    ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007', 'DG-02: PII scrubbing via AI Gateway'),
    ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'MR-04: Explainability logging expectations'),
    ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Model inventory'),
    ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'MR-02: Validation before retrain'),
    ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', 'MR-04: SHAP logging per transaction'),
    ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 'DG-02: Data handling in fraud pipeline'),
    ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Chatbot registered as model'),
    ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', 'DG-02: Gateway scrubs customer-facing prompts');

-- Systems present in catalog seed: credit-decision, fraud-monitoring, ai-gateway.
INSERT INTO ai_system_to_system (ai_system_id, system_id, relationship) VALUES
    ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'READS_FROM'),
    ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'DEPLOYED_ON'),
    ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'DEPLOYED_ON'),
    ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'READS_FROM'),
    ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'DEPLOYED_ON');
