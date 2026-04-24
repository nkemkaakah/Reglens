"""HTTP-level tests for /api/documents — ObligationClient mocked via dependency_overrides."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

import httpx
import pytest
import respx
from httpx import AsyncClient

from app.api.routers import documents as documents_router
from app.schemas.documents import ObligationResponse
from tests.conftest import FakeObligationClient


@pytest.fixture
def patch_extraction_two_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid real model calls in HTTP tests — returns two structured rows before document persist."""

    async def _fake_collect_structured_obligations_from_source(
        **kwargs: object,
    ) -> list[tuple[int, documents_router._LlmObligationItem]]:
        _ = kwargs
        return [
            (
                0,
                documents_router._LlmObligationItem(
                    ref="ignored",
                    title="Test obligation one",
                    summary="Summary one.",
                    full_text="Full text one.",
                    section_ref="§1",
                    topics=["AI Governance"],
                    ai_principles=["Accountability"],
                    risk_rating="HIGH",
                    effective_date=None,
                ),
            ),
            (
                0,
                documents_router._LlmObligationItem(
                    ref="ignored",
                    title="Test obligation two",
                    summary="Summary two.",
                    full_text="Full text two.",
                    section_ref="§2",
                    topics=["Transparency"],
                    ai_principles=["Transparency"],
                    risk_rating="MEDIUM",
                    effective_date=None,
                ),
            ),
        ]

    monkeypatch.setattr(
        documents_router,
        "collect_structured_obligations_from_source",
        _fake_collect_structured_obligations_from_source,
    )


async def test_ingest_requires_file_or_url(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
) -> None:
    response = await async_client.post("/api/documents", data={"regulator": "PRA"})
    assert response.status_code == 400
    assert fake_obligation_client.create_document_calls == []


async def test_ingest_rejects_whitespace_only_url(async_client: AsyncClient) -> None:
    response = await async_client.post("/api/documents", data={"source_url": "   \t  "})
    assert response.status_code == 400


async def test_ingest_with_file_returns_two_obligations(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    patch_extraction_two_rows: None,
) -> None:
    files = {"file": ("FCA_Notice.pdf", b"%PDF-1.4 test-bytes", "application/pdf")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 201
    body = response.json()
    assert body["obligation_count"] == 2
    assert len(body["obligations"]) == 2
    assert len(fake_obligation_client.create_document_calls) == 1
    assert len(fake_obligation_client.create_batch_calls) == 1
    assert len(fake_obligation_client.create_batch_calls[0]) == 2


@respx.mock
async def test_ingest_with_source_url_only(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    patch_extraction_two_rows: None,
) -> None:
    respx.get("https://www.fca.org.uk/publication/example").mock(
        return_value=httpx.Response(
            200,
            text="<html><body>Firms must document AI governance.</body></html>",
            headers={"content-type": "text/html; charset=utf-8"},
        )
    )
    data = {"source_url": "https://www.fca.org.uk/publication/example"}
    response = await async_client.post("/api/documents", data=data)

    assert response.status_code == 201
    doc_call = fake_obligation_client.create_document_calls[0]
    assert doc_call.url == "https://www.fca.org.uk/publication/example"
    # Host slug should survive in the generated ref (e.g. WWW-FCA-ORG-UK-URL-…)
    assert "FCA" in doc_call.ref.upper() or "WWW" in doc_call.ref.upper()


async def test_ingest_file_plus_url_sets_document_url(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    patch_extraction_two_rows: None,
) -> None:
    files = {"file": ("doc.pdf", b"%PDF", "application/pdf")}
    data = {"source_url": "https://reg.example/rule.pdf"}
    response = await async_client.post("/api/documents", files=files, data=data)

    assert response.status_code == 201
    assert fake_obligation_client.create_document_calls[0].url == "https://reg.example/rule.pdf"


async def test_ingest_form_overrides_metadata(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    patch_extraction_two_rows: None,
) -> None:
    files = {"file": ("x.pdf", b"%PDF", "application/pdf")}
    data = {
        "ref": "MANUAL-REF-001",
        "title": "Manual title",
        "regulator": "PRA",
        "doc_type": "Policy",
        "ingested_by": "tester@reglens",
    }
    response = await async_client.post("/api/documents", files=files, data=data)

    assert response.status_code == 201
    doc_call = fake_obligation_client.create_document_calls[0]
    assert doc_call.ref == "MANUAL-REF-001"
    assert doc_call.title == "Manual title"
    assert doc_call.regulator == "PRA"
    assert doc_call.doc_type == "Policy"
    assert doc_call.ingested_by == "tester@reglens"


async def test_ingest_propagates_upstream_status(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    patch_extraction_two_rows: None,
) -> None:
    req = httpx.Request("POST", "http://obligation/documents")
    resp = httpx.Response(409, request=req, text="duplicate document ref")
    fake_obligation_client.create_document_error = httpx.HTTPStatusError(
        "conflict",
        request=req,
        response=resp,
    )

    files = {"file": ("a.pdf", b"%PDF", "application/pdf")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 409
    assert "duplicate" in response.json()["detail"].lower()


async def test_ingest_rejects_oversized_upload(
    monkeypatch: pytest.MonkeyPatch,
    async_client: AsyncClient,
) -> None:
    from app.api.routers import documents as documents_router

    monkeypatch.setattr(documents_router, "_MAX_UPLOAD_BYTES", 8)

    files = {"file": ("huge.bin", b"x" * 20, "application/octet-stream")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 413


async def test_list_obligations_for_document_ok(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
) -> None:
    did = uuid4()
    fake_obligation_client.list_result = [
        ObligationResponse(
            id=uuid4(),
            document_id=did,
            document_ref="DR",
            document_title="DT",
            regulator="FCA",
            ref="O1",
            title="t",
            summary="s",
            full_text="f",
            section_ref=None,
            topics=[],
            ai_principles=[],
            risk_rating="LOW",
            effective_date=None,
            status="UNMAPPED",
            triaged_by=None,
            triaged_at=None,
            created_at=datetime.now(UTC),
        )
    ]

    response = await async_client.get(f"/api/documents/{did}/obligations")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert fake_obligation_client.list_calls == [did]


async def test_list_obligations_for_document_not_found(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
) -> None:
    did = UUID("d1000000-0000-0000-0000-000000000099")
    req = httpx.Request("GET", f"http://obligation/documents/{did}/obligations")
    resp = httpx.Response(404, request=req, text="Document not found")
    fake_obligation_client.list_error = httpx.HTTPStatusError(
        "missing",
        request=req,
        response=resp,
    )

    response = await async_client.get(f"/api/documents/{did}/obligations")

    assert response.status_code == 404
