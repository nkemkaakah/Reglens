"""
Placeholder obligation extraction — returns a small fixed set of structured rows.

Phase 1 Slice 1B proves the HTTP + persistence path before PDF parsing and LangChain exist.
Replace this module with a real pipeline module that still outputs list[ObligationCreate].
"""

from __future__ import annotations

import re
from uuid import UUID, uuid4

from app.schemas.documents import ObligationCreate


def slug_document_ref_prefix(raw: str) -> str:
    """
    Produce a short, human-readable token for document / obligation `ref` prefixes.

    obligation.ref is UNIQUE globally in Postgres — callers still add random suffixes per run.
    """
    slug = re.sub(r"[^A-Za-z0-9]+", "-", raw.strip()).strip("-").upper()
    return slug[:48] if slug else "DOCUMENT"


def build_stub_obligations(
    *,
    document_id: UUID,
    document_ref: str,
    context_label: str,
) -> list[ObligationCreate]:
    """
    Build deterministic-looking demo obligations tied to the uploaded file name or pasted URL.

    `context_label` is only copied into full_text so reviewers can see what was "ingested".
    """
    token = uuid4().hex[:8].upper()
    base_ref = f"{slug_document_ref_prefix(document_ref)}-STUB-{token}"

    return [
        ObligationCreate(
            document_id=document_id,
            ref=f"{base_ref}-01",
            title="Stub: governance and accountability (demo extraction)",
            summary=(
                "Demonstration obligation — replace stub pipeline with real chunking and LLM output. "
                "Covers senior accountability and documented AI governance expectations."
            ),
            full_text=(
                f"[Stub pipeline] Source context: {context_label}\n\n"
                "Firms must maintain clear accountability structures for material AI systems, "
                "including named owners and escalation paths aligned to existing conduct frameworks."
            ),
            section_ref="Stub §1 — Accountability",
            topics=["AI Governance", "Accountability", "Stub"],
            ai_principles=["Accountability", "Governance"],
            risk_rating="HIGH",
            status="UNMAPPED",
        ),
        ObligationCreate(
            document_id=document_id,
            ref=f"{base_ref}-02",
            title="Stub: transparency and customer-facing AI (demo extraction)",
            summary=(
                "Demonstration obligation — preview how consumer transparency requirements "
                "surface as discrete, triageable units."
            ),
            full_text=(
                f"[Stub pipeline] Source context: {context_label}\n\n"
                "Where AI materially influences customer outcomes, firms should ensure customers "
                "receive meaningful information and, where appropriate, access to human review."
            ),
            section_ref="Stub §2 — Transparency",
            topics=["Transparency", "Consumer Outcomes", "Stub"],
            ai_principles=["Transparency", "Fairness"],
            risk_rating="MEDIUM",
            status="UNMAPPED",
        ),
    ]
