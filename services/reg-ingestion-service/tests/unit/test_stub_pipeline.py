"""Unit tests for stub extraction helpers — no HTTP, no FastAPI."""

from uuid import uuid4

from app.services.stub_pipeline import build_stub_obligations, slug_document_ref_prefix


def test_slug_document_ref_prefix_normalises_and_uppercases() -> None:
    assert slug_document_ref_prefix("  FCA AI Update 2024  ") == "FCA-AI-UPDATE-2024"


def test_slug_document_ref_prefix_truncates_to_48_chars() -> None:
    long = "A" * 80
    assert len(slug_document_ref_prefix(long)) == 48


def test_slug_document_ref_prefix_empty_fallback() -> None:
    assert slug_document_ref_prefix("@@@") == "DOCUMENT"
    assert slug_document_ref_prefix("   ") == "DOCUMENT"


def test_build_stub_obligations_returns_two_rows_with_shared_stub_token() -> None:
    doc_id = uuid4()
    doc_ref = "MY-DOC-REF"
    label = "sample.pdf"

    rows = build_stub_obligations(document_id=doc_id, document_ref=doc_ref, context_label=label)

    assert len(rows) == 2
    assert rows[0].document_id == doc_id
    assert rows[1].document_id == doc_id
    assert rows[0].ref.endswith("-01")
    assert rows[1].ref.endswith("-02")
    # Same STUB token segment between the two obligations
    prefix = rows[0].ref.rsplit("-", 1)[0]
    assert rows[1].ref.rsplit("-", 1)[0] == prefix
    assert label in rows[0].full_text
    assert label in rows[1].full_text
    assert rows[0].risk_rating == "HIGH"
    assert rows[1].risk_rating == "MEDIUM"
    assert rows[0].status == "UNMAPPED"
    assert rows[1].status == "UNMAPPED"


def test_build_stub_obligations_refs_are_distinct() -> None:
    doc_id = uuid4()
    a = build_stub_obligations(document_id=doc_id, document_ref="R", context_label="x")
    b = build_stub_obligations(document_id=doc_id, document_ref="R", context_label="x")
    assert a[0].ref != b[0].ref
