"""
Thin async wrapper around obligation-service REST endpoints.

reg-ingestion-service never talks to Postgres directly in Phase 1 — it orchestrates uploads,
runs the extraction pipeline, then persists through this client (service token on writes).
"""

from __future__ import annotations

from uuid import UUID

import httpx

from app.schemas.documents import DocumentCreate, DocumentResponse, ObligationCreate, ObligationResponse


class ObligationClient:
    """
    Holds a long-lived AsyncClient (created in FastAPI lifespan) for connection reuse.

    Base URL should be the root of the Spring app, e.g. http://obligation-service:8080
    """

    def __init__(self, base_url: str, service_token: str) -> None:
        self._service_token = service_token
        root = base_url.rstrip("/")
        # Reasonable default timeout — LLM-heavy work stays in this service, not in these HTTP calls.
        self._http = httpx.AsyncClient(base_url=root, timeout=httpx.Timeout(60.0))

    def _write_headers(self) -> dict[str, str]:
        """Spring Security expects the shared dev/service bearer on POST routes."""
        return {"Authorization": f"Bearer {self._service_token}"}

    async def aclose(self) -> None:
        """Called on app shutdown so the process does not leak sockets."""
        await self._http.aclose()

    async def create_document(self, payload: DocumentCreate) -> DocumentResponse:
        """POST /documents — first step of ingest; returns assigned UUID."""
        response = await self._http.post(
            "/documents",
            json=payload.model_dump(mode="json", by_alias=True, exclude_none=True),
            headers=self._write_headers(),
        )
        response.raise_for_status()
        return DocumentResponse.model_validate(response.json())

    async def create_obligations_batch(self, items: list[ObligationCreate]) -> list[ObligationResponse]:
        """POST /obligations/batch — one round-trip for the whole stub or LLM extraction output."""
        body = [item.model_dump(mode="json", by_alias=True, exclude_none=True) for item in items]
        response = await self._http.post(
            "/obligations/batch",
            json=body,
            headers=self._write_headers(),
        )
        response.raise_for_status()
        return [ObligationResponse.model_validate(row) for row in response.json()]

    async def list_obligations_for_document(self, document_id: UUID, *, page_size: int = 500) -> list[ObligationResponse]:
        """
        GET /documents/{id}/obligations — public read path; used for preview after ingest.

        Walks every page until exhausted (rarely more than one page during Phase 1 demos).
        """
        collected: list[ObligationResponse] = []
        page = 0
        while True:
            response = await self._http.get(
                f"/documents/{document_id}/obligations",
                params={"page": page, "size": page_size, "sort": "createdAt"},
            )
            response.raise_for_status()
            payload = response.json()
            for row in payload.get("content", []):
                collected.append(ObligationResponse.model_validate(row))
            last = payload.get("last", True)
            if last or not payload.get("content"):
                break
            page += 1
        return collected
