"""Contract checks: Python DTOs must round-trip to the same JSON shape Spring uses."""

from datetime import date
from uuid import UUID

from app.schemas.documents import DocumentCreate, DocumentResponse, ObligationCreate, ObligationResponse


def test_document_create_dumps_camel_case_for_spring() -> None:
    payload = DocumentCreate(
        ref="R1",
        title="T",
        regulator="FCA",
        doc_type="PDF",
        url="https://example.com/x",
        published_date=date(2024, 1, 2),
        effective_date=date(2024, 3, 4),
        topics=["AI"],
        ingested_by="svc@reglens",
    )
    dumped = payload.model_dump(mode="json", by_alias=True, exclude_none=True)
    assert dumped["docType"] == "PDF"
    assert dumped["publishedDate"] == "2024-01-02"
    assert dumped["effectiveDate"] == "2024-03-04"
    assert dumped["ingestedBy"] == "svc@reglens"
    assert "documentId" not in dumped


def test_obligation_create_dumps_camel_case_for_spring() -> None:
    did = UUID("d1000000-0000-0000-0000-000000000001")
    ob = ObligationCreate(
        document_id=did,
        ref="OB-1",
        title="t",
        summary="s",
        full_text="full",
        section_ref="§1",
        topics=["x"],
        ai_principles=["Transparency"],
        risk_rating="LOW",
        status="UNMAPPED",
    )
    dumped = ob.model_dump(mode="json", by_alias=True, exclude_none=True)
    assert dumped["documentId"] == str(did)
    assert dumped["fullText"] == "full"
    assert dumped["sectionRef"] == "§1"
    assert dumped["aiPrinciples"] == ["Transparency"]


def test_document_response_parses_spring_json() -> None:
    raw = {
        "id": "d1000000-0000-0000-0000-000000000001",
        "ref": "DOC",
        "title": "T",
        "regulator": "FCA",
        "docType": "PDF",
        "url": None,
        "publishedDate": None,
        "effectiveDate": None,
        "status": "ACTIVE",
        "topics": ["a"],
        "ingestedAt": "2024-01-15T10:00:00+00:00",
        "ingestedBy": "u@x.com",
    }
    m = DocumentResponse.model_validate(raw)
    assert m.doc_type == "PDF"
    assert m.ingested_by == "u@x.com"


def test_obligation_response_parses_spring_json_with_null_triaged() -> None:
    raw = {
        "id": "e1000000-0000-0000-0000-000000000001",
        "documentId": "d1000000-0000-0000-0000-000000000001",
        "documentRef": "DR",
        "documentTitle": "DT",
        "regulator": "FCA",
        "ref": "OR",
        "title": "t",
        "summary": "s",
        "fullText": "f",
        "sectionRef": None,
        "topics": [],
        "aiPrinciples": [],
        "riskRating": "LOW",
        "effectiveDate": None,
        "status": "UNMAPPED",
        "triagedBy": None,
        "triagedAt": None,
        "createdAt": "2024-01-15T10:00:00+00:00",
    }
    m = ObligationResponse.model_validate(raw)
    assert m.document_ref == "DR"
    assert m.triaged_at is None
