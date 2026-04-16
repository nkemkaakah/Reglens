"""Unit tests for shared ingestion ref helpers — no HTTP, no FastAPI."""

from app.services.stub_pipeline import slug_document_ref_prefix


def test_slug_document_ref_prefix_normalises_and_uppercases() -> None:
    assert slug_document_ref_prefix("  FCA AI Update 2024  ") == "FCA-AI-UPDATE-2024"


def test_slug_document_ref_prefix_truncates_to_48_chars() -> None:
    long = "A" * 80
    assert len(slug_document_ref_prefix(long)) == 48


def test_slug_document_ref_prefix_empty_fallback() -> None:
    assert slug_document_ref_prefix("@@@") == "DOCUMENT"
    assert slug_document_ref_prefix("   ") == "DOCUMENT"
