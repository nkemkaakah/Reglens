"""
Shared fixtures: FastAPI app + async HTTP client + fake obligation-service.

dependency_overrides replaces get_obligation_client so routes never read app.state — tests do not
need a running Spring container even if lifespan still wires a real ObligationClient for shutdown.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.api import deps
from app.main import create_app
from app.schemas.documents import DocumentCreate, DocumentResponse, ObligationCreate, ObligationResponse


class _DummyAnthropicClient:
    """Resolved by dependency override so HTTP tests never need app lifespan or a real API key."""

    async def close(self) -> None:
        pass


class FakeObligationClient:
    """
    In-memory stand-in for ObligationClient — records inputs and returns plausible responses.

    Subclass or patch instance attributes for failure scenarios.
    """

    def __init__(self) -> None:
        self.create_document_calls: list[DocumentCreate] = []
        self.create_batch_calls: list[list[ObligationCreate]] = []
        self.list_calls: list[UUID] = []
        self._last_document: DocumentResponse | None = None
        self.create_document_error: httpx.HTTPStatusError | None = None
        self.create_batch_error: httpx.HTTPStatusError | None = None
        self.list_error: httpx.HTTPStatusError | None = None
        self.list_result: list[ObligationResponse] | None = None

    async def create_document(self, payload: DocumentCreate) -> DocumentResponse:
        if self.create_document_error:
            raise self.create_document_error
        self.create_document_calls.append(payload)
        self._last_document = DocumentResponse(
            id=uuid4(),
            ref=payload.ref,
            title=payload.title,
            regulator=payload.regulator,
            doc_type=payload.doc_type,
            url=payload.url,
            published_date=payload.published_date,
            effective_date=payload.effective_date,
            status="ACTIVE",
            topics=payload.topics,
            ingested_at=datetime.now(UTC),
            ingested_by=payload.ingested_by or "fake",
        )
        return self._last_document

    async def create_obligations_batch(self, items: list[ObligationCreate]) -> list[ObligationResponse]:
        if self.create_batch_error:
            raise self.create_batch_error
        self.create_batch_calls.append(items)
        doc = self._last_document
        assert doc is not None
        now = datetime.now(UTC)
        out: list[ObligationResponse] = []
        for ob in items:
            out.append(
                ObligationResponse(
                    id=uuid4(),
                    document_id=ob.document_id,
                    document_ref=doc.ref,
                    document_title=doc.title,
                    regulator=doc.regulator,
                    ref=ob.ref,
                    title=ob.title,
                    summary=ob.summary,
                    full_text=ob.full_text,
                    section_ref=ob.section_ref,
                    topics=ob.topics,
                    ai_principles=ob.ai_principles,
                    risk_rating=ob.risk_rating,
                    effective_date=ob.effective_date,
                    status=ob.status or "UNMAPPED",
                    triaged_by=None,
                    triaged_at=None,
                    created_at=now,
                )
            )
        return out

    async def list_obligations_for_document(self, document_id: UUID, *, page_size: int = 500) -> list[ObligationResponse]:
        if self.list_error:
            raise self.list_error
        self.list_calls.append(document_id)
        if self.list_result is not None:
            return self.list_result
        return []

    async def aclose(self) -> None:
        pass


@pytest.fixture
def fake_obligation_client() -> FakeObligationClient:
    return FakeObligationClient()


@pytest_asyncio.fixture
async def async_client(fake_obligation_client: FakeObligationClient) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[deps.get_obligation_client] = lambda: fake_obligation_client
    app.dependency_overrides[deps.get_anthropic_client] = lambda: _DummyAnthropicClient()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
