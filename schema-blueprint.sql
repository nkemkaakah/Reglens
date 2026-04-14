-- =============================================================================
-- RegLens — Nexus Bank Seed Data
-- =============================================================================
-- This seed represents Nexus Bank's existing compliance posture as if they have
-- already integrated with RegLens. It is NOT test/mock data — it is treated as
-- the ground truth of the bank's regulatory and AI governance state at go-live.
--
-- Seeding order matters (foreign keys):
--   1. teams → 2. systems → 3. controls → 4. documents → 5. obligations →
--   6. ai_systems → 7. ai_risk_assessments →
--   8. control_to_system → 9. ai_system_to_control → 10. ai_system_to_system →
--   11. obligation_to_control → 12. obligation_to_system → 13. impact_analyses
-- =============================================================================


-- =============================================================================
-- SCHEMA
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- Teams / owning groups within Nexus Bank
CREATE TABLE IF NOT EXISTS teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL,   -- e.g. 'Risk', 'Technology', 'Compliance'
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal microservices / systems owned by Nexus Bank
CREATE TABLE IF NOT EXISTS systems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref             TEXT NOT NULL UNIQUE,   -- e.g. 'credit-decision-service'
    display_name    TEXT NOT NULL,
    description     TEXT,
    domain          TEXT,                   -- e.g. 'Credit', 'Fraud', 'Onboarding'
    tech_stack      TEXT[],                 -- e.g. ARRAY['Java', 'Spring Boot', 'Postgres']
    repo_url        TEXT,
    owner_team_id   UUID REFERENCES teams(id),
    criticality     TEXT CHECK (criticality IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Control library — the bank's catalogue of risk/compliance controls
CREATE TABLE IF NOT EXISTS controls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref             TEXT NOT NULL UNIQUE,   -- e.g. 'MR-04'
    category        TEXT NOT NULL,          -- e.g. 'Model Risk'
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    evidence_type   TEXT,                   -- e.g. 'Test logs', 'Review minutes', 'Monitoring dashboard'
    review_frequency TEXT,                  -- e.g. 'Quarterly', 'Annual', 'Continuous'
    owner_team_id   UUID REFERENCES teams(id),
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','UNDER_REVIEW','DEPRECATED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regulatory source documents (FCA/PRA/BoE papers)
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref             TEXT NOT NULL UNIQUE,   -- e.g. 'FCA-AI-UPDATE-2024'
    title           TEXT NOT NULL,
    regulator       TEXT NOT NULL,          -- e.g. 'FCA', 'PRA', 'BOE'
    doc_type        TEXT,                   -- e.g. 'Policy Statement', 'Guidance', 'Dear CEO'
    url             TEXT,
    published_date  DATE,
    effective_date  DATE,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    topics          TEXT[],
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ingested_by     TEXT NOT NULL DEFAULT 'compliance.seed@nexusbank.com'
);

-- Obligations extracted from documents
CREATE TABLE IF NOT EXISTS obligations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ref             TEXT NOT NULL UNIQUE,   -- e.g. 'FCA-AI-2024-OB-003'
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,          -- plain-language summary (AI-generated, human-approved)
    full_text       TEXT NOT NULL,          -- verbatim regulatory text
    section_ref     TEXT,                   -- e.g. 'Section 4.2'
    topics          TEXT[],
    ai_principles   TEXT[],                 -- e.g. ARRAY['Transparency','Accountability']
    risk_rating     TEXT CHECK (risk_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    effective_date  DATE,
    status          TEXT NOT NULL DEFAULT 'UNMAPPED'
                        CHECK (status IN ('UNMAPPED','IN_PROGRESS','MAPPED','IMPLEMENTED')),
    triaged_by      TEXT,
    triaged_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI / ML / GenAI systems registered by Nexus Bank
CREATE TABLE IF NOT EXISTS ai_systems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref             TEXT NOT NULL UNIQUE,   -- e.g. 'NXB-AI-001'
    name            TEXT NOT NULL,
    description     TEXT,
    ai_type         TEXT NOT NULL CHECK (ai_type IN ('ML','LLM','GENAI','RULE_BASED','HYBRID')),
    use_case        TEXT NOT NULL,
    business_domain TEXT,
    model_provider  TEXT,                   -- e.g. 'OpenAI', 'Anthropic', 'In-house'
    model_name      TEXT,                   -- e.g. 'gpt-4o', 'claude-3-opus'
    data_sources    TEXT[],
    owner_team_id   UUID REFERENCES teams(id),
    tech_lead_email TEXT,
    risk_rating     TEXT CHECK (risk_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    deployed_at     DATE,
    last_reviewed   DATE,
    status          TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE','IN_REVIEW','DECOMMISSIONED','PROPOSED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk assessments for each AI system
CREATE TABLE IF NOT EXISTS ai_risk_assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_system_id    UUID NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    assessed_by     TEXT NOT NULL,
    overall_rating  TEXT NOT NULL CHECK (overall_rating IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    bias_risk       TEXT,
    explainability_risk TEXT,
    data_quality_risk   TEXT,
    operational_risk    TEXT,
    notes           TEXT,
    next_review_date DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join: control ↔ system
CREATE TABLE IF NOT EXISTS control_to_system (
    control_id  UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    system_id   UUID NOT NULL REFERENCES systems(id)  ON DELETE CASCADE,
    notes       TEXT,
    PRIMARY KEY (control_id, system_id)
);

-- Join: AI system ↔ control
CREATE TABLE IF NOT EXISTS ai_system_to_control (
    ai_system_id UUID NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
    control_id   UUID NOT NULL REFERENCES controls(id)   ON DELETE CASCADE,
    notes        TEXT,
    PRIMARY KEY (ai_system_id, control_id)
);

-- Join: AI system ↔ internal system
CREATE TABLE IF NOT EXISTS ai_system_to_system (
    ai_system_id UUID NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
    system_id    UUID NOT NULL REFERENCES systems(id)    ON DELETE CASCADE,
    relationship TEXT,    -- e.g. 'DEPLOYED_ON', 'READS_FROM', 'WRITES_TO'
    PRIMARY KEY (ai_system_id, system_id)
);

-- Approved mappings: obligation → control (human-reviewed)
CREATE TABLE IF NOT EXISTS obligation_to_control (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    control_id      UUID NOT NULL REFERENCES controls(id)    ON DELETE CASCADE,
    confidence      NUMERIC(4,3),   -- 0.000–1.000 (AI-suggested confidence)
    source          TEXT CHECK (source IN ('AI_SUGGESTED','MANUAL')),
    explanation     TEXT,           -- why this mapping was made
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    UNIQUE (obligation_id, control_id)
);

-- Approved mappings: obligation → system (human-reviewed)
CREATE TABLE IF NOT EXISTS obligation_to_system (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    system_id       UUID NOT NULL REFERENCES systems(id)     ON DELETE CASCADE,
    confidence      NUMERIC(4,3),
    source          TEXT CHECK (source IN ('AI_SUGGESTED','MANUAL')),
    explanation     TEXT,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    UNIQUE (obligation_id, system_id)
);

-- Impact analyses generated per obligation (after mappings approved)
CREATE TABLE IF NOT EXISTS impact_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id   UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE UNIQUE,
    summary         TEXT NOT NULL,                -- developer-friendly plain-language summary
    suggested_tasks JSONB NOT NULL DEFAULT '[]',  -- array of {system_ref, task, type, priority}
    generated_by    TEXT NOT NULL DEFAULT 'reglens-ai',
    reviewed_by     TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- 1. TEAMS
-- =============================================================================

INSERT INTO teams (id, name, domain, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Model Risk & Validation',     'Risk',       'model-risk@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Data Governance Office',       'Risk',       'data-governance@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Regulatory Affairs',           'Compliance', 'reg-affairs@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000004', 'Customer & Conduct Risk',      'Compliance', 'conduct-risk@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000005', 'Technology Risk & Controls',   'Technology', 'tech-risk@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000006', 'Credit Risk Technology',       'Technology', 'credit-tech@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000007', 'Financial Crime Technology',   'Technology', 'fc-tech@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000008', 'Digital Banking Engineering',  'Technology', 'digital-eng@nexusbank.com'),
  ('a1000000-0000-0000-0000-000000000009', 'AI & Data Science',            'Technology', 'ai-ds@nexusbank.com');


-- =============================================================================
-- 2. SYSTEMS  (Nexus Bank internal service catalogue)
-- =============================================================================

INSERT INTO systems (id, ref, display_name, description, domain, tech_stack, repo_url, owner_team_id, criticality) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'credit-decision-service',
    'Credit Decision Service',
    'Core underwriting engine. Evaluates credit applications using rule-based scoring, ML model outputs and bureau data. Produces approve/decline/refer decisions with explanation payloads.',
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
    'Real-time transaction screening service. Calls the ML fraud detection model, evaluates rule-based thresholds, and raises alerts to the fraud ops team. Logs all decisions with feature vectors for audit.',
    'Fraud',
    ARRAY['Java 21', 'Spring Boot 3', 'Kafka', 'Redis', 'Postgres'],
    'https://github.com/nexusbank/fraud-monitoring-service',
    'a1000000-0000-0000-0000-000000000007',
    'CRITICAL'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'customer-onboarding-service',
    'Customer Onboarding Service',
    'Orchestrates new customer registration flows: identity verification (KYC), sanctions screening, PEP checks, and account creation. Delegates to specialist third-party APIs.',
    'Onboarding',
    ARRAY['Node.js 20', 'TypeScript', 'PostgreSQL', 'Kafka'],
    'https://github.com/nexusbank/customer-onboarding-service',
    'a1000000-0000-0000-0000-000000000008',
    'HIGH'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'customer-comms-service',
    'Customer Communications Service',
    'Manages all outbound customer communications: email, SMS, push notifications and in-app messaging. Responsible for templating, consent checking and delivery receipts.',
    'Digital',
    ARRAY['Python 3.12', 'FastAPI', 'PostgreSQL', 'Redis', 'Kafka'],
    'https://github.com/nexusbank/customer-comms-service',
    'a1000000-0000-0000-0000-000000000008',
    'HIGH'
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'model-monitoring-service',
    'Model Monitoring Service',
    'Continuous monitoring platform for all ML/AI models in production. Tracks data drift, performance degradation, fairness metrics and generates alerts when thresholds are breached.',
    'Risk',
    ARRAY['Python 3.12', 'FastAPI', 'TimescaleDB', 'Kafka', 'Grafana'],
    'https://github.com/nexusbank/model-monitoring-service',
    'a1000000-0000-0000-0000-000000000009',
    'HIGH'
  ),
  (
    'b1000000-0000-0000-0000-000000000006',
    'ai-gateway-service',
    'AI Gateway Service',
    'Internal proxy for all LLM and third-party AI API calls. Handles rate limiting, prompt logging, cost tracking, PII (personally identifiable information) scrubbing, and fallback routing.',
    'Platform',
    ARRAY['Node.js 20', 'TypeScript', 'Redis', 'Postgres'],
    'https://github.com/nexusbank/ai-gateway-service',
    'a1000000-0000-0000-0000-000000000009',
    'CRITICAL'
  ),
  (
    'b1000000-0000-0000-0000-000000000007',
    'document-intelligence-service',
    'Document Intelligence Service',
    'Extracts structured data from unstructured documents (PDFs, scanned forms). Used in credit memo generation and onboarding document verification.',
    'Credit',
    ARRAY['Python 3.12', 'FastAPI', 'AWS S3', 'Postgres'],
    'https://github.com/nexusbank/document-intelligence-service',
    'a1000000-0000-0000-0000-000000000009',
    'MEDIUM'
  );


-- =============================================================================
-- 3. CONTROLS  (Nexus Bank control library — 20 controls)
-- =============================================================================

INSERT INTO controls (id, ref, category, title, description, evidence_type, review_frequency, owner_team_id, status) VALUES

  -- MODEL RISK (MR)
  (
    'c1000000-0000-0000-0000-000000000001', 'MR-01', 'Model Risk',
    'Model Inventory Register',
    'All ML/AI/statistical models used in production must be registered in the Model Inventory before deployment. The register must include: model purpose, owning team, tech lead, training data source, last validation date, risk tier, and current status.',
    'Inventory extract; quarterly attestation by model owners',
    'Quarterly',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000002', 'MR-02', 'Model Risk',
    'Pre-deployment Model Validation',
    'All HIGH and CRITICAL-rated models must undergo independent validation by the Model Risk & Validation team before production deployment. Validation must assess: accuracy on hold-out data, fairness across protected characteristics, robustness to adversarial inputs, and documentation completeness.',
    'Signed validation report; approval sign-off in model governance system',
    'Per deployment / Major version change',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000003', 'MR-03', 'Model Risk',
    'Ongoing Model Performance Monitoring',
    'All production models must have automated monitoring in place for: prediction accuracy (vs baseline), data drift (PSI — Population Stability Index threshold: 0.2), concept drift, and fairness metric deviation. Alerts must be routed to the owning team and model risk within 24 hours of threshold breach.',
    'Monitoring dashboard; alert history log; monthly performance report',
    'Continuous; formal review Monthly',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000004', 'MR-04', 'Model Risk',
    'Decision Explainability Logging',
    'All model-driven decisions that result in a customer outcome (approve, decline, restrict) must log: model version, top contributing features with direction of impact, decision score, and threshold applied. Logs must be retained for a minimum of 7 years and be retrievable on a per-customer basis within 48 hours of request.',
    'Log retention audit; sample retrieval tests; quarterly spot-check report',
    'Continuous; spot-check Quarterly',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000005', 'MR-05', 'Model Risk',
    'Annual Model Review & Recertification',
    'All production models must be formally reviewed at least annually by the owning team in collaboration with Model Risk. Review must assess continued fitness for purpose, material changes in the operating environment, fairness performance, and any incidents or near-misses. Models that fail recertification must be placed in a remediation plan within 30 days.',
    'Signed recertification form; model risk committee minutes; remediation log',
    'Annual',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),

  -- DATA GOVERNANCE (DG)
  (
    'c1000000-0000-0000-0000-000000000006', 'DG-01', 'Data Governance',
    'Training Data Lineage & Documentation',
    'All ML model training datasets must have documented lineage: data source, collection period, preprocessing steps applied, exclusions made and rationale, and any known biases or limitations. Documentation must be maintained in the Data Catalogue and reviewed at each model revalidation.',
    'Data Catalogue entry; lineage diagram; sign-off by Data Governance Office',
    'Per model version',
    'a1000000-0000-0000-0000-000000000002', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000007', 'DG-02', 'Data Governance',
    'PII Handling in AI Pipelines',
    'Personally Identifiable Information (PII) must not be used as a direct feature input to ML models unless a lawful basis and Data Protection Impact Assessment (DPIA) have been completed and approved. Where PII is processed for AI purposes, pseudonymisation or tokenisation must be applied at source. The AI Gateway must scrub PII from all LLM prompt inputs before dispatch.',
    'DPIA register; AI Gateway PII scrubbing test results; data flow audit',
    'Per new data source; Annual audit',
    'a1000000-0000-0000-0000-000000000002', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000008', 'DG-03', 'Data Governance',
    'Data Retention for AI Decision Records',
    'All records that constitute an AI-driven decision (inputs, outputs, model version, timestamp, customer reference) must be retained for a minimum of 7 years in a tamper-evident store. Retention schedules must be documented and verified annually.',
    'Retention policy document; annual verification report; storage audit trail',
    'Annual verification; continuous storage',
    'a1000000-0000-0000-0000-000000000002', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000009', 'DG-04', 'Data Governance',
    'Third-Party Data Provider Assurance',
    'External data providers used in AI model inputs (e.g. credit bureau data, fraud intelligence feeds) must be subject to annual third-party risk assessments covering: data quality SLAs, accuracy, timeliness, and their own data governance practices. Contracts must include AI-specific data use clauses.',
    'Third-party risk assessment report; contract review; annual attestation',
    'Annual',
    'a1000000-0000-0000-0000-000000000002', 'ACTIVE'
  ),

  -- CUSTOMER COMMUNICATION (CC)
  (
    'c1000000-0000-0000-0000-000000000010', 'CC-01', 'Customer Communication',
    'AI Decision Explanation to Customers',
    'Where an AI-driven decision has a material impact on a customer (e.g. credit decline, fraud block, account restriction), the customer must receive a plain-language explanation of the principal reasons. Explanations must not disclose model internals but must be meaningful and actionable. Explanations generated by GenAI must be reviewed by the Customer & Conduct Risk team before templates are approved.',
    'Approved explanation templates; sample customer communications; complaints log',
    'Per template change; Quarterly complaints review',
    'a1000000-0000-0000-0000-000000000004', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000011', 'CC-02', 'Customer Communication',
    'AI Disclosure in Customer-Facing Products',
    'Customers must be clearly informed when they are interacting with an AI system (e.g. a GenAI chatbot) and must have the option to escalate to a human agent. Disclosure language must be reviewed by Legal and Conduct Risk before publication.',
    'Published disclosure copy; escalation pathway test results; complaint analysis',
    'Per launch / material change; Annual review',
    'a1000000-0000-0000-0000-000000000004', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000012', 'CC-03', 'Customer Communication',
    'GenAI Output Quality Assurance',
    'All customer-facing content produced by GenAI systems (chatbot responses, automated letters, in-app messages) must pass automated quality checks for: factual accuracy, tone compliance, regulatory phrase compliance, and PII leakage. Outputs must be logged for 90 days minimum to support post-hoc review.',
    'QA test suite results; output log samples; incident log',
    'Continuous; Quarterly audit',
    'a1000000-0000-0000-0000-000000000004', 'ACTIVE'
  ),

  -- OPERATIONAL RESILIENCE (OR)
  (
    'c1000000-0000-0000-0000-000000000013', 'OR-01', 'Operational Resilience',
    'AI System Business Impact Assessment',
    'All CRITICAL and HIGH-rated AI systems must have a documented Business Impact Assessment (BIA) describing: maximum tolerable downtime, impact of model unavailability on business operations, fallback/manual processes, and recovery time objective (RTO). BIAs must be reviewed annually and after major incidents.',
    'BIA document; annual review sign-off; incident post-mortem',
    'Annual; post-incident',
    'a1000000-0000-0000-0000-000000000005', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000014', 'OR-02', 'Operational Resilience',
    'Fallback & Manual Override Capability',
    'All AI systems that make or influence credit, fraud, or customer onboarding decisions must have a tested, documented fallback mechanism that can be activated within 2 hours of AI system failure. Fallback must be rule-based or manual and must maintain regulatory compliance without the AI component.',
    'Fallback runbook; semi-annual failover test results; activation log',
    'Semi-annual test',
    'a1000000-0000-0000-0000-000000000005', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000015', 'OR-03', 'Operational Resilience',
    'AI Incident Response & Escalation',
    'A documented incident response procedure must exist for all production AI systems, covering: detection criteria, severity classification, escalation path (including to SMCR — Senior Manager & Certification Regime — accountable senior manager for AI), customer communication obligations, and regulatory notification thresholds.',
    'Incident response procedure document; tabletop exercise record; incident log',
    'Annual tabletop exercise; per incident',
    'a1000000-0000-0000-0000-000000000005', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000016', 'OR-04', 'Operational Resilience',
    'AI System Change Management',
    'All material changes to AI systems (model retraining, threshold adjustments, feature additions) must follow the Technology Change Management process and additionally require sign-off from Model Risk & Validation. Emergency changes must be retrospectively reviewed within 5 business days.',
    'Change record; model risk sign-off; emergency change retrospective log',
    'Per change; Quarterly trend review',
    'a1000000-0000-0000-0000-000000000005', 'ACTIVE'
  ),

  -- AI GOVERNANCE (AG)
  (
    'c1000000-0000-0000-0000-000000000017', 'AG-01', 'AI Governance',
    'SMCR Accountability Mapping for AI',
    'Each AI system classified as HIGH or CRITICAL must have a named SMCR Senior Manager designated as accountable. The accountability mapping must be documented, kept current, and available to the FCA/PRA on request within 24 hours.',
    'SMCR mapping register; attestation; audit trail of updates',
    'Annual; on change of role',
    'a1000000-0000-0000-0000-000000000003', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000018', 'AG-02', 'AI Governance',
    'AI Fairness & Bias Assessment',
    'All AI models used in credit, fraud, onboarding or customer service decisions must undergo a fairness assessment before deployment and annually thereafter. Assessment must test for disparate impact across FCA-protected characteristics (age, gender, ethnicity, disability). Results must be presented to the Model Risk Committee.',
    'Fairness assessment report; protected characteristics analysis; committee minutes',
    'Pre-deployment; Annual',
    'a1000000-0000-0000-0000-000000000001', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000019', 'AG-03', 'AI Governance',
    'Human-in-the-Loop for High-Risk Decisions',
    'AI-driven decisions above defined materiality thresholds (e.g. credit exposures > £50,000; fraud blocks on business accounts) must include a human review step before the decision is communicated to the customer. The review step must be logged and the human reviewer identified.',
    'Decision audit log; human review completion rate; escalation report',
    'Continuous; Monthly report',
    'a1000000-0000-0000-0000-000000000004', 'ACTIVE'
  ),
  (
    'c1000000-0000-0000-0000-000000000020', 'AG-04', 'AI Governance',
    'Regulatory Notification for AI Model Incidents',
    'Material AI model failures (causing customer harm, regulatory breach, or significant operational disruption) must be reported to the relevant regulator (FCA or PRA) within the applicable notification window (typically 72 hours for operational incidents under DORA — Digital Operational Resilience Act). A post-incident report must be submitted within 30 days.',
    'Regulatory notification record; post-incident report; timeline log',
    'Per incident',
    'a1000000-0000-0000-0000-000000000003', 'ACTIVE'
  );


-- =============================================================================
-- 4. REGULATORY DOCUMENTS
-- =============================================================================

INSERT INTO documents (id, ref, title, regulator, doc_type, url, published_date, effective_date, topics) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-UPDATE-2024',
    'Artificial Intelligence Update — FCA, PRA and Bank of England Joint Response to Government AI White Paper',
    'FCA',
    'Joint Regulatory Statement',
    'https://www.fca.org.uk/publication/corporate/ai-update.pdf',
    '2024-02-06',
    '2024-02-06',
    ARRAY['AI Governance', 'Model Risk', 'Explainability', 'Accountability', 'Fairness', 'Safety']
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'PRA-SS1-21-OP-RESILIENCE',
    'Operational Resilience: Impact Tolerances for Important Business Services — SS1/21',
    'PRA',
    'Supervisory Statement',
    'https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-ss',
    '2021-03-29',
    '2022-03-31',
    ARRAY['Operational Resilience', 'Business Continuity', 'Impact Tolerances', 'Important Business Services']
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'FCA-CP24-2-AI-GOVERNANCE',
    'Discussion Paper DP5/22 — Artificial Intelligence and Machine Learning — Thematic Review Follow-Up',
    'FCA',
    'Discussion Paper',
    'https://www.fca.org.uk/publications/discussion-papers/dp5-22-artificial-intelligence-and-machine-learning',
    '2022-10-19',
    '2022-10-19',
    ARRAY['AI', 'Machine Learning', 'Model Governance', 'Data Bias', 'Explainability', 'Consumer Outcomes']
  );


-- =============================================================================
-- 5. OBLIGATIONS  (extracted and triaged — as if a compliance officer already processed these)
-- =============================================================================

INSERT INTO obligations (id, document_id, ref, title, summary, full_text, section_ref, topics, ai_principles, risk_rating, effective_date, status, triaged_by, triaged_at) VALUES

  -- From FCA AI Update 2024
  (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-001',
    'Firms must be able to explain AI-driven decisions to consumers',
    'Where an AI system makes or materially influences a decision that affects a consumer, the firm must be able to provide a meaningful, plain-language explanation of the principal reasons for that decision. Explanations must be actionable — the consumer must understand what they could do differently. Firms should maintain explanation templates approved by compliance.',
    'Firms should be able to explain the principal reasons for decisions or recommendations made or materially influenced by AI models to consumers who are affected by those decisions, where the outcome of such decisions or recommendations could be materially adverse to the consumer. This includes providing a meaningful, plain-language explanation that a consumer can act upon.',
    'Section 4.3',
    ARRAY['Explainability', 'Consumer Outcomes', 'AI Governance'],
    ARRAY['Transparency', 'Fairness', 'Accountability'],
    'HIGH',
    '2024-02-06',
    'MAPPED',
    'amara.okafor@nexusbank.com',
    '2024-03-01 09:15:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-002',
    'Senior Managers must be accountable for AI use under SMCR',
    'Each AI system that materially influences a regulated activity must have a named Senior Manager (under SMCR) who is personally accountable for its governance, oversight and compliance with regulatory requirements. This accountability must be documented and up-to-date.',
    'The FCA, PRA and Bank of England expect firms to apply existing accountability frameworks — including the Senior Managers and Certification Regime — to the governance of AI systems. A named Senior Manager should be accountable for each AI system that materially influences a regulated activity, with that accountability documented and reviewable by supervisors.',
    'Section 3.1',
    ARRAY['Accountability', 'SMCR', 'AI Governance'],
    ARRAY['Accountability', 'Governance'],
    'CRITICAL',
    '2024-02-06',
    'MAPPED',
    'amara.okafor@nexusbank.com',
    '2024-03-01 09:30:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-003',
    'Firms must test AI models for bias and unfair outcomes',
    'Firms must assess and test AI models for bias and disparate impact across protected characteristics before deployment and on an ongoing basis. Where bias is identified, firms must remediate or implement compensating controls before the model is used in decisions affecting consumers.',
    'Firms should assess their AI models for potential bias and unfair customer outcomes, including testing across protected characteristics. Testing should occur at the design and deployment stage, and firms should have ongoing monitoring arrangements to detect bias that may emerge over time, including through model drift. Firms that identify bias should implement remediation measures or compensating controls.',
    'Section 4.5',
    ARRAY['Fairness', 'Model Risk', 'Consumer Outcomes'],
    ARRAY['Fairness', 'Safety', 'Accountability'],
    'HIGH',
    '2024-02-06',
    'MAPPED',
    'amara.okafor@nexusbank.com',
    '2024-03-01 10:00:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-004',
    'Firms must disclose AI use in customer-facing services',
    'Customers must be clearly informed when they are interacting with or being assessed by an AI system, in a manner that is fair, clear and not misleading. For automated decision-making, the disclosure must include the right to request human review.',
    'Consistent with the FCA''s consumer duty and existing disclosure obligations, firms should ensure that customers are appropriately informed where AI is being used in a customer-facing capacity, including in automated decision-making processes. Customers should be made aware of their rights, including the right to seek human review of a material adverse automated decision.',
    'Section 5.2',
    ARRAY['Transparency', 'Consumer Duty', 'Disclosure'],
    ARRAY['Transparency', 'Fairness', 'Contestability'],
    'HIGH',
    '2024-02-06',
    'IN_PROGRESS',
    'amara.okafor@nexusbank.com',
    '2024-03-05 11:00:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-005',
    'AI systems must be robust and resilient to adversarial inputs',
    'Firms must ensure AI systems are tested for robustness, including adversarial inputs and out-of-distribution scenarios. Systems that are vulnerable to manipulation must not be used in regulated activities without compensating controls. Robustness testing results must be documented.',
    'Firms should ensure that AI models deployed in regulated activities are robust to adversarial inputs, unexpected data distributions, and edge cases that may arise in live operations. Robustness testing should be documented and form part of the pre-deployment validation process. For high-risk applications, ongoing red-teaming or adversarial testing should be incorporated into the model lifecycle.',
    'Section 4.4',
    ARRAY['Safety', 'Model Risk', 'Robustness'],
    ARRAY['Safety', 'Security', 'Robustness'],
    'HIGH',
    '2024-02-06',
    'UNMAPPED',
    NULL,
    NULL
  ),

  -- From PRA SS1/21 Operational Resilience
  (
    'e1000000-0000-0000-0000-000000000006',
    'd1000000-0000-0000-0000-000000000002',
    'PRA-SS121-OB-001',
    'Firms must define impact tolerances for AI-dependent important business services',
    'Where an important business service (IBS) depends materially on an AI system, the firm must define an impact tolerance for that AI system consistent with the tolerance of the IBS. The firm must be able to remain within this tolerance during severe but plausible disruption scenarios, including AI model failure.',
    'Firms are expected to identify their important business services and set impact tolerances for each. Where an important business service relies materially on AI or automated decision systems, the firm should consider the resilience of those systems when setting and testing impact tolerances. Firms should be able to demonstrate they can remain within their impact tolerances during severe but plausible operational disruption scenarios.',
    'Chapter 5',
    ARRAY['Operational Resilience', 'Impact Tolerances', 'AI Systems', 'Business Continuity'],
    ARRAY['Safety', 'Robustness'],
    'CRITICAL',
    '2022-03-31',
    'MAPPED',
    'david.mensah@nexusbank.com',
    '2022-06-01 14:00:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000007',
    'd1000000-0000-0000-0000-000000000002',
    'PRA-SS121-OB-002',
    'Firms must test ability to remain within impact tolerances annually',
    'Firms must conduct annual scenario tests to demonstrate they can recover within their defined impact tolerances following severe but plausible disruption. Where AI systems are part of the tested services, the test must include scenarios where the AI component fails or produces erroneous outputs.',
    'Firms should test their ability to remain within impact tolerances annually and lessons from testing should be used to improve operational resilience. Testing should cover severe but plausible scenarios and should include, where relevant, scenarios in which AI or automated components become unavailable or produce materially incorrect outputs.',
    'Chapter 7',
    ARRAY['Operational Resilience', 'Scenario Testing', 'Annual Testing'],
    ARRAY['Safety', 'Robustness'],
    'HIGH',
    '2022-03-31',
    'IMPLEMENTED',
    'david.mensah@nexusbank.com',
    '2022-07-15 09:00:00+00'
  ),

  -- From FCA DP5/22
  (
    'e1000000-0000-0000-0000-000000000008',
    'd1000000-0000-0000-0000-000000000003',
    'FCA-DP522-OB-001',
    'Model documentation must be sufficient to enable independent review',
    'Model documentation must be comprehensive enough that an independent reviewer (internal audit, model risk, or regulator) could evaluate the model''s design, data, limitations and risk controls without needing to consult the development team. Documentation must be version-controlled and updated at each material change.',
    'Firms should ensure that model documentation is sufficient to allow an independent reviewer to understand how the model works, what data it uses, its known limitations, the risk controls in place, and how it performs across different population segments. Documentation should be version-controlled and updated at each material model change.',
    'Section 3.4',
    ARRAY['Model Documentation', 'Model Risk', 'Explainability'],
    ARRAY['Transparency', 'Accountability'],
    'MEDIUM',
    '2022-10-19',
    'IN_PROGRESS',
    'amara.okafor@nexusbank.com',
    '2023-02-10 10:30:00+00'
  );


-- =============================================================================
-- 6. AI SYSTEMS  (Nexus Bank AI system registry)
-- =============================================================================

INSERT INTO ai_systems (id, ref, name, description, ai_type, use_case, business_domain, model_provider, model_name, data_sources, owner_team_id, tech_lead_email, risk_rating, deployed_at, last_reviewed, status) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'NXB-AI-001',
    'Credit Memo AI Assistant',
    'LLM-powered assistant that drafts structured credit assessment memos for relationship managers. Reads customer financial data, bureau data and account history from internal systems; produces a draft memo with risk narrative, financials summary, and a recommended credit view. The relationship manager reviews, edits and approves before submission. Uses the AI Gateway for all LLM calls with PII scrubbing enforced.',
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
    'Gradient boosting ML model (XGBoost) that scores every card and payment transaction in real time for fraud risk. Outputs a probability score (0–1) and a set of top contributing features. Scores are consumed by the Fraud Monitoring Service which applies rule-based thresholds to raise alerts. Monitored continuously by the Model Monitoring Service. The model is retrained quarterly on 18 months of labelled transaction data.',
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
    'GenAI-powered conversational assistant embedded in the Nexus Bank mobile app and internet banking. Handles tier-1 customer service queries: account balance, recent transactions, card controls, dispute initiation, and general FAQs. Escalates to a human agent for complex or sensitive queries. All responses are generated via the AI Gateway with quality checks applied before delivery to the customer.',
    'GENAI',
    'Tier-1 automated customer service — balance, transactions, disputes, FAQs',
    'Digital',
    'OpenAI',
    'gpt-4o-mini',
    ARRAY['customer-comms-service', 'Core Banking System (read-only)', 'FAQ Knowledge Base (internal)', 'Product Documentation'],
    'a1000000-0000-0000-0000-000000000008',
    'priya.nair@nexusbank.com',
    'HIGH',
    '2023-09-01',
    '2024-11-01',
    'LIVE'
  );


-- =============================================================================
-- 7. AI RISK ASSESSMENTS
-- =============================================================================

INSERT INTO ai_risk_assessments (ai_system_id, assessment_date, assessed_by, overall_rating, bias_risk, explainability_risk, data_quality_risk, operational_risk, notes, next_review_date) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    '2024-10-01',
    'Model Risk & Validation Team',
    'HIGH',
    'MEDIUM — Training data spans 2019–2024; limited representation of newer SME sectors. Annual fairness assessment completed; no material disparate impact detected across gender/ethnicity but monitoring ongoing.',
    'MEDIUM — Memo drafts include a model-generated rationale but the underlying LLM reasoning is not fully auditable. Explainability mitigated by mandatory human review before submission.',
    'LOW — Data sourced from regulated bureau and internal systems; data quality SLAs in place.',
    'MEDIUM — Fallback to manual memo drafting is possible; tested semi-annually. LLM provider dependency is a concentration risk.',
    'Human-in-the-loop mandatory before any memo is submitted. PII scrubbing via AI Gateway confirmed operational. Relationship managers must attest to review before submission.',
    '2025-10-01'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    '2024-09-15',
    'Model Risk & Validation Team',
    'CRITICAL',
    'HIGH — Tested for disparate impact across race/postcode proxies; some disparity detected in alert rates for certain postcode segments. Remediation plan in progress: additional feature engineering to decouple postcode from socioeconomic proxies.',
    'MEDIUM — SHAP (SHapley Additive exPlanations) values logged per decision; top 5 features stored with direction of impact. Explainability considered adequate for operational purposes.',
    'MEDIUM — Third-party merchant enrichment data has occasional gaps during provider incidents. Fallback to internal merchant data only during outages.',
    'CRITICAL — Real-time scoring with sub-200ms SLA. Model unavailability falls back to rule-based scoring. Quarterly retraining introduces deployment risk; mitigated by A/B shadow testing before rollout.',
    'Bias remediation plan approved by Model Risk Committee September 2024. ETA: Q1 2025 retrain. SMCR accountability: CFO (Chief Financial Officer) accountable per AG-01 mapping.',
    '2025-03-15'
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    '2024-11-01',
    'Model Risk & Validation Team',
    'HIGH',
    'LOW — Chatbot does not make decisions affecting protected characteristics directly. Indirect bias risk monitored via complaint analysis.',
    'HIGH — GenAI responses are not fully deterministic or auditable at the token level. Mitigated by: output quality checks (automated), 90-day log retention, and mandatory escalation path to human agents.',
    'LOW — Knowledge base is version-controlled; updates require compliance sign-off before deployment.',
    'MEDIUM — LLM provider (OpenAI) outages would disable the chatbot. Human agent escalation path confirmed available 24/7.',
    'CC-02 (AI Disclosure) template approved and live in mobile app as of October 2023. Escalation path to human agent tested monthly. Hallucination rate monitored weekly via sample review.',
    '2025-11-01'
  );


-- =============================================================================
-- 8. CONTROL ↔ SYSTEM  (which controls govern which services)
-- =============================================================================

INSERT INTO control_to_system (control_id, system_id, notes) VALUES
  -- MR-04 (Decision Explainability Logging) governs credit-decision-service and fraud-monitoring-service
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'credit-decision-service must log model version, top features, score and threshold per decision'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'fraud-monitoring-service must log SHAP values and decision basis per transaction'),
  -- MR-03 (Model Performance Monitoring) — model-monitoring-service is the implementation
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 'model-monitoring-service is the primary implementation of this control'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'fraud-monitoring-service emits monitoring events consumed by model-monitoring-service'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'credit-decision-service emits scoring events consumed by model-monitoring-service'),
  -- DG-02 (PII Handling) — AI Gateway is the enforcement point
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000006', 'AI Gateway enforces PII scrubbing on all outbound LLM prompts'),
  -- CC-02 (AI Disclosure) — customer-comms-service and customer-onboarding-service
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000004', 'customer-comms-service delivers disclosure messaging'),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000003', 'customer-onboarding-service surfaces disclosure during account opening'),
  -- CC-03 (GenAI Output QA) — AI Gateway
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000006', 'AI Gateway runs automated quality checks on all GenAI outputs before delivery'),
  -- OR-02 (Fallback Capability) — credit-decision-service and fraud-monitoring-service have fallback modes
  ('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000001', 'credit-decision-service has a rule-based fallback mode activated when LLM is unavailable'),
  ('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000002', 'fraud-monitoring-service falls back to static rule engine when ML model is unavailable'),
  -- DG-03 (Data Retention) — all decision-producing services
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', 'credit-decision-service decision records retained 7 years in tamper-evident store'),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'fraud-monitoring-service alert records retained 7 years');


-- =============================================================================
-- 9. AI SYSTEM ↔ CONTROL
-- =============================================================================

INSERT INTO ai_system_to_control (ai_system_id, control_id, notes) VALUES
  -- NXB-AI-001 (Credit Memo Assistant)
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Registered in model inventory since 2024-01-15'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'MR-02: Validated pre-deployment Oct 2023; next validation due Jan 2025'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007', 'DG-02: PII scrubbing enforced via AI Gateway on all prompts'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000017', 'AG-01: CFO named as SMCR-accountable senior manager'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000019', 'AG-03: Human review mandatory — relationship manager must attest before submission'),
  -- NXB-AI-002 (Fraud Detection Model)
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Registered in model inventory since 2022-11-01'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'MR-02: Validated quarterly before each retrain deployment'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'MR-03: Monitored by model-monitoring-service; PSI alerts configured'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', 'MR-04: SHAP values logged per transaction decision'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000018', 'AG-02: Fairness assessment completed Sep 2024; bias remediation in progress'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000017', 'AG-01: CFO named as SMCR-accountable senior manager'),
  -- NXB-AI-003 (Customer Support Chatbot)
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'MR-01: Registered in model inventory since 2023-09-01'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000011', 'CC-02: AI disclosure active in mobile app; escalation path tested monthly'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000012', 'CC-03: Automated quality checks on all responses via AI Gateway'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', 'DG-02: AI Gateway scrubs PII from all prompts; customer data accessed read-only');


-- =============================================================================
-- 10. AI SYSTEM ↔ INTERNAL SYSTEM
-- =============================================================================

INSERT INTO ai_system_to_system (ai_system_id, system_id, relationship) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'DEPLOYED_ON'),
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000007', 'READS_FROM'),
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'DEPLOYED_ON'),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'DEPLOYED_ON'),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 'MONITORED_BY'),
  ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'DEPLOYED_ON'),
  ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'DEPLOYED_ON');


-- =============================================================================
-- 11. OBLIGATION ↔ CONTROL  (approved mappings with AI suggestions that were human-reviewed)
-- =============================================================================

INSERT INTO obligation_to_control (obligation_id, control_id, confidence, source, explanation, approved_by, approved_at) VALUES
  -- FCA-AI-2024-OB-001 (Explainability to consumers) → CC-01, MR-04
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000010', 0.95, 'AI_SUGGESTED', 'CC-01 directly governs the production and approval of AI decision explanation templates for customers. This obligation requires the same capability.', 'amara.okafor@nexusbank.com', '2024-03-10 10:00:00+00'),
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 0.88, 'AI_SUGGESTED', 'MR-04 governs decision explainability logging. Without logged explainability data, CC-01 customer explanations cannot be generated. These controls work together.', 'amara.okafor@nexusbank.com', '2024-03-10 10:05:00+00'),
  -- FCA-AI-2024-OB-002 (SMCR Accountability) → AG-01
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000017', 0.98, 'AI_SUGGESTED', 'AG-01 is the exact control that implements SMCR accountability mapping for AI systems. Direct 1:1 match.', 'amara.okafor@nexusbank.com', '2024-03-10 10:15:00+00'),
  -- FCA-AI-2024-OB-003 (Bias testing) → AG-02, MR-02, MR-03
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000018', 0.97, 'AI_SUGGESTED', 'AG-02 is the primary control for fairness and bias assessment across protected characteristics.', 'amara.okafor@nexusbank.com', '2024-03-12 09:00:00+00'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 0.82, 'AI_SUGGESTED', 'MR-02 pre-deployment validation includes fairness testing as a mandatory component.', 'amara.okafor@nexusbank.com', '2024-03-12 09:10:00+00'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 0.79, 'AI_SUGGESTED', 'MR-03 ongoing monitoring must include fairness metric deviation detection per this obligation.', 'amara.okafor@nexusbank.com', '2024-03-12 09:20:00+00'),
  -- FCA-AI-2024-OB-004 (AI Disclosure) → CC-02, AG-03
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000011', 0.96, 'AI_SUGGESTED', 'CC-02 directly implements AI disclosure requirements in customer-facing products.', 'priya.nair@nexusbank.com', '2024-03-15 14:00:00+00'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000019', 0.84, 'AI_SUGGESTED', 'AG-03 implements the human review right referenced in this obligation for material adverse automated decisions.', 'priya.nair@nexusbank.com', '2024-03-15 14:10:00+00'),
  -- PRA-SS121-OB-001 (Impact tolerances for AI-dependent IBS) → OR-01, OR-02
  ('e1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000013', 0.93, 'AI_SUGGESTED', 'OR-01 Business Impact Assessment is the mechanism through which impact tolerances are defined for AI-dependent services.', 'david.mensah@nexusbank.com', '2022-06-10 10:00:00+00'),
  ('e1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000014', 0.90, 'AI_SUGGESTED', 'OR-02 Fallback Capability is the technical control that allows the bank to remain within impact tolerances when the AI component fails.', 'david.mensah@nexusbank.com', '2022-06-10 10:15:00+00'),
  -- PRA-SS121-OB-002 (Annual scenario testing) → OR-02, OR-03
  ('e1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000014', 0.88, 'AI_SUGGESTED', 'OR-02 semi-annual fallback testing is the primary mechanism for this obligation.', 'david.mensah@nexusbank.com', '2022-07-20 09:00:00+00'),
  ('e1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000015', 0.75, 'MANUAL', 'OR-03 incident response procedure must cover the scenario-testing failure scenarios described in this obligation. Added manually after legal review.', 'david.mensah@nexusbank.com', '2022-07-22 11:00:00+00');


-- =============================================================================
-- 12. OBLIGATION ↔ SYSTEM  (which systems must change / already comply)
-- =============================================================================

INSERT INTO obligation_to_system (obligation_id, system_id, confidence, source, explanation, approved_by, approved_at) VALUES
  -- FCA-AI-2024-OB-001 → credit-decision-service, fraud-monitoring-service, customer-comms-service
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 0.94, 'AI_SUGGESTED', 'credit-decision-service produces decline decisions that require customer explanations.', 'amara.okafor@nexusbank.com', '2024-03-10 10:20:00+00'),
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 0.91, 'AI_SUGGESTED', 'fraud-monitoring-service produces fraud blocks requiring customer explanation.', 'amara.okafor@nexusbank.com', '2024-03-10 10:25:00+00'),
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 0.87, 'AI_SUGGESTED', 'customer-comms-service is the delivery mechanism for customer explanation communications.', 'amara.okafor@nexusbank.com', '2024-03-10 10:30:00+00'),
  -- FCA-AI-2024-OB-004 → customer-comms-service, customer-onboarding-service
  ('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 0.95, 'AI_SUGGESTED', 'customer-comms-service surfaces the AI disclosure notice and escalation option.', 'priya.nair@nexusbank.com', '2024-03-15 14:20:00+00'),
  ('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 0.88, 'AI_SUGGESTED', 'customer-onboarding-service must surface AI disclosure at account opening if AI is used in the journey.', 'priya.nair@nexusbank.com', '2024-03-15 14:25:00+00'),
  -- PRA-SS121-OB-001 → fraud-monitoring-service, credit-decision-service
  ('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 0.95, 'AI_SUGGESTED', 'fraud-monitoring-service is an IBS-supporting system with a defined impact tolerance.', 'david.mensah@nexusbank.com', '2022-06-10 10:30:00+00'),
  ('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 0.92, 'AI_SUGGESTED', 'credit-decision-service supports the retail credit IBS with a defined impact tolerance.', 'david.mensah@nexusbank.com', '2022-06-10 10:35:00+00');


-- =============================================================================
-- 13. IMPACT ANALYSES  (generated after mapping approval)
-- =============================================================================

INSERT INTO impact_analyses (obligation_id, summary, suggested_tasks, generated_by, reviewed_by, reviewed_at) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'This obligation requires that customers receive a meaningful plain-language explanation whenever an AI-driven decision materially affects them (e.g. credit decline, fraud block). Three Nexus Bank services are impacted. The credit-decision-service and fraud-monitoring-service must ensure their explanation payloads are complete and retrievable. The customer-comms-service must have approved explanation templates for each decision type.',
    '[
      {"system_ref": "credit-decision-service", "task": "Verify that explanation payloads (model version, top 5 features, direction of impact, threshold applied) are stored per decision and retrievable within 48 hours. Add integration test for retrieval endpoint.", "type": "VERIFY_AND_TEST", "priority": "HIGH"},
      {"system_ref": "fraud-monitoring-service", "task": "Verify SHAP explanation payload is stored for every fraud alert raised. Ensure payload includes human-readable feature names, not internal variable codes.", "type": "VERIFY_AND_TEST", "priority": "HIGH"},
      {"system_ref": "customer-comms-service", "task": "Ensure approved explanation templates exist for: credit decline, fraud block, account restriction. Templates must be reviewed by Conduct Risk before activation. Add a template version audit log.", "type": "GOVERNANCE_ACTION", "priority": "HIGH"},
      {"system_ref": "credit-decision-service", "task": "Add unit tests verifying that explanation payload is non-empty for every decline decision path (auto-decline, refer-then-decline, manual-decline).", "type": "TESTING", "priority": "MEDIUM"}
    ]',
    'reglens-ai',
    'amara.okafor@nexusbank.com',
    '2024-03-15 15:00:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'This obligation requires that each AI system has a named SMCR Senior Manager accountable for its governance. Nexus Bank has partially addressed this: both NXB-AI-001 and NXB-AI-002 have CFO named. This impact analysis covers the documentation and evidence requirements, not system changes.',
    '[
      {"system_ref": "all", "task": "Ensure all three AI systems (NXB-AI-001, NXB-AI-002, NXB-AI-003) have a named SMCR accountable senior manager documented in the AI System Registry with date of assignment.", "type": "GOVERNANCE_ACTION", "priority": "CRITICAL"},
      {"system_ref": "all", "task": "Produce SMCR accountability mapping document in RegLens AI Registry, exportable as PDF for regulator review. Include: senior manager name, role, date assigned, scope of accountability.", "type": "DOCUMENTATION", "priority": "CRITICAL"}
    ]',
    'reglens-ai',
    'amara.okafor@nexusbank.com',
    '2024-03-16 09:00:00+00'
  ),
  (
    'e1000000-0000-0000-0000-000000000006',
    'This PRA obligation requires that Nexus Bank defines and tests impact tolerances for AI-dependent important business services. The fraud-monitoring-service and credit-decision-service are the primary systems in scope. Both have BIAs and fallback modes documented; the key actions are ensuring these are current and tested against the latest PRA supervisory expectations.',
    '[
      {"system_ref": "fraud-monitoring-service", "task": "Review and update Business Impact Assessment (BIA) for fraud-monitoring-service. Confirm maximum tolerable downtime is still aligned with PRA expectations. Ensure fallback to rule-based scoring is documented with a tested RTO (recovery time objective) of < 2 hours.", "type": "GOVERNANCE_ACTION", "priority": "CRITICAL"},
      {"system_ref": "credit-decision-service", "task": "Review and update BIA for credit-decision-service. Include AI model failure as an explicit disruption scenario. Confirm fallback mode activation procedure is documented and tested.", "type": "GOVERNANCE_ACTION", "priority": "CRITICAL"},
      {"system_ref": "fraud-monitoring-service", "task": "Schedule and document annual scenario test that includes AI model unavailability. Record test results, gaps identified and remediation actions in the operational resilience log.", "type": "TESTING", "priority": "HIGH"}
    ]',
    'reglens-ai',
    'david.mensah@nexusbank.com',
    '2022-07-01 11:00:00+00'
  );