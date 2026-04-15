INSERT INTO documents (id, ref, title, regulator, doc_type, url, published_date, effective_date, topics)
VALUES (
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-UPDATE-2024',
    'Artificial Intelligence Update — FCA, PRA and Bank of England Joint Response',
    'FCA',
    'Joint Regulatory Statement',
    'https://www.fca.org.uk/publication/corporate/ai-update.pdf',
    '2024-02-06',
    '2024-02-06',
    ARRAY['AI Governance', 'Model Risk', 'Explainability', 'Accountability', 'Fairness']
);

INSERT INTO obligations (id, document_id, ref, title, summary, full_text, section_ref, topics, ai_principles, risk_rating, effective_date, status, triaged_by, triaged_at)
VALUES
(
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-001',
    'Firms must be able to explain AI-driven decisions to consumers',
    'Where an AI system makes or materially influences a decision affecting a consumer, the firm must provide a meaningful plain-language explanation.',
    'Firms should be able to explain the principal reasons for decisions or recommendations made or materially influenced by AI models to consumers who are affected by those decisions.',
    'Section 4.3',
    ARRAY['Explainability', 'Consumer Outcomes', 'AI Governance'],
    ARRAY['Transparency', 'Fairness', 'Accountability'],
    'HIGH',
    '2024-02-06',
    'MAPPED',
    'seed@reglens.internal',
    now()
),
(
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-002',
    'Senior Managers must be accountable for AI use under SMCR',
    'Each AI system that materially influences a regulated activity must have a named Senior Manager accountable for its governance.',
    'The FCA, PRA and Bank of England expect firms to apply existing accountability frameworks to AI governance. A named Senior Manager should be accountable for each AI system.',
    'Section 3.1',
    ARRAY['Accountability', 'SMCR', 'AI Governance'],
    ARRAY['Accountability', 'Governance'],
    'CRITICAL',
    '2024-02-06',
    'UNMAPPED',
    NULL,
    NULL
),
(
    'e1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'FCA-AI-2024-OB-003',
    'Firms must test AI models for bias and unfair outcomes',
    'Firms must assess and test AI models for bias and disparate impact across protected characteristics before deployment and on an ongoing basis.',
    'Firms should assess their AI models for potential bias and unfair customer outcomes, including testing across protected characteristics.',
    'Section 4.5',
    ARRAY['Fairness', 'Model Risk', 'Consumer Outcomes'],
    ARRAY['Fairness', 'Safety', 'Accountability'],
    'HIGH',
    '2024-02-06',
    'IN_PROGRESS',
    'seed@reglens.internal',
    now()
);
