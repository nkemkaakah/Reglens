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


async def test_ingest_with_file_returns_accepted_job(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
) -> None:
    files = {"file": ("FCA_Notice.pdf", b"%PDF-1.4 test-bytes", "application/pdf")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "PENDING"
    assert "job_id" in body
    assert fake_obligation_client.create_document_calls == []

    job_id = body["job_id"]
    poll = await async_client.get(f"/api/documents/jobs/{job_id}")
    assert poll.status_code == 200
    assert poll.json()["status"] == "PENDING"


@respx.mock
async def test_ingest_with_source_url_only(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    published: list[dict[str, object]] = []

    def capture(**kwargs: object) -> None:
        published.append(dict(kwargs))

    monkeypatch.setattr(documents_router, "publish_ingest_requested_sync", capture)

    respx.get("https://www.fca.org.uk/publication/example").mock(
        return_value=httpx.Response(
            200,
            text="<html><body>Firms must document AI governance.</body></html>",
            headers={"content-type": "text/html; charset=utf-8"},
        )
    )
    data = {"source_url": "https://www.fca.org.uk/publication/example"}
    response = await async_client.post("/api/documents", data=data)

    assert response.status_code == 202
    assert published, "ingest should publish a Kafka message"
    assert published[0]["source_url"] == "https://www.fca.org.uk/publication/example"
    assert "FCA" in published[0]["ref"].upper() or "WWW" in published[0]["ref"].upper()


async def test_ingest_file_plus_url_sets_source_url_in_message(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    published: list[dict[str, object]] = []

    def capture(**kwargs: object) -> None:
        published.append(dict(kwargs))

    monkeypatch.setattr(documents_router, "publish_ingest_requested_sync", capture)

    files = {"file": ("doc.pdf", b"%PDF", "application/pdf")}
    data = {"source_url": "https://reg.example/rule.pdf"}
    response = await async_client.post("/api/documents", files=files, data=data)

    assert response.status_code == 202
    assert published[0]["source_url"] == "https://reg.example/rule.pdf"


async def test_ingest_form_overrides_metadata(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    published: list[dict[str, object]] = []

    def capture(**kwargs: object) -> None:
        published.append(dict(kwargs))

    monkeypatch.setattr(documents_router, "publish_ingest_requested_sync", capture)

    files = {"file": ("x.pdf", b"%PDF", "application/pdf")}
    data = {
        "ref": "MANUAL-REF-001",
        "title": "Manual title",
        "regulator": "PRA",
        "doc_type": "Policy",
        "ingested_by": "tester@reglens",
    }
    response = await async_client.post("/api/documents", files=files, data=data)

    assert response.status_code == 202
    assert published[0]["ref"] == "MANUAL-REF-001"
    assert published[0]["title"] == "Manual title"
    assert published[0]["regulator"] == "PRA"
    assert published[0]["doc_type"] == "Policy"
    assert published[0]["ingested_by"] == "tester@reglens"


async def test_ingest_returns_503_when_kafka_publish_fails(
    async_client: AsyncClient,
    fake_obligation_client: FakeObligationClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def boom(**kwargs: object) -> None:
        raise RuntimeError("broker unavailable")

    monkeypatch.setattr(documents_router, "publish_ingest_requested_sync", boom)

    files = {"file": ("a.pdf", b"%PDF", "application/pdf")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 503
    assert fake_obligation_client.create_document_calls == []


async def test_ingest_rejects_oversized_upload(
    monkeypatch: pytest.MonkeyPatch,
    async_client: AsyncClient,
) -> None:
    monkeypatch.setattr(documents_router, "_MAX_UPLOAD_BYTES", 8)

    files = {"file": ("huge.bin", b"x" * 20, "application/octet-stream")}
    response = await async_client.post("/api/documents", files=files)

    assert response.status_code == 413


async def test_get_ingest_job_unknown_returns_404(async_client: AsyncClient) -> None:
    rid = uuid4()
    response = await async_client.get(f"/api/documents/jobs/{rid}")
    assert response.status_code == 404


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
