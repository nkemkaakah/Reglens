"""
Thin async wrapper around obligation-service REST endpoints.

reg-ingestion-service never talks to Postgres directly in Phase 1 — it orchestrates uploads,
runs the extraction pipeline, then persists through this client (service token on writes).
"""

from __future__ import annotations

import base64
import json
import logging
import time
from uuid import UUID

import httpx

from app.schemas.documents import DocumentCreate, DocumentResponse, ObligationCreate, ObligationResponse

logger = logging.getLogger(__name__)

_JWT_ISS = "https://demo.reglens.io"
_JWT_AUD = "https://api.reglens.io"


def _b64url_json(obj: dict[str, object]) -> str:
    raw = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _build_demo_service_jwt(*, sub: str, role: str, ttl_seconds: int) -> str:
    """Unsigned JWT matching frontend/src/lib/session.ts — Java ServiceTokenAuthFilter checks iss/aud/exp only."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload: dict[str, object] = {
        "sub": sub,
        "aud": _JWT_AUD,
        "iss": _JWT_ISS,
        "iat": now,
        "exp": now + ttl_seconds,
        "https://reglens.io/role": role,
    }
    return f"{_b64url_json(header)}.{_b64url_json(payload)}.local-signature"


class ObligationClient:
    """
    Holds a long-lived AsyncClient (created in FastAPI lifespan) for connection reuse.

    Base URL should be the root of the Spring app, e.g. http://obligation-service:8080
    """

    def __init__(
        self,
        base_url: str,
        *,
        service_token: str = "",
        jwt_sub: str = "reg-ingestion-service",
        jwt_role: str = "ADMIN",
        jwt_ttl_seconds: int = 86400,
    ) -> None:
        self._service_token = service_token
        self._jwt_sub = jwt_sub
        self._jwt_role = jwt_role
        self._jwt_ttl_seconds = jwt_ttl_seconds
        root = base_url.rstrip("/")
        # Reasonable default timeout — LLM-heavy work stays in this service, not in these HTTP calls.
        self._http = httpx.AsyncClient(base_url=root, timeout=httpx.Timeout(60.0))

    def _bearer_token(self) -> str:
        t = self._service_token.strip()
        if t:
            return t
        return _build_demo_service_jwt(
            sub=self._jwt_sub,
            role=self._jwt_role,
            ttl_seconds=self._jwt_ttl_seconds,
        )

    def _write_headers(self) -> dict[str, str]:
        """Bearer JWT: optional env override, else demo token (iss/aud/exp) for obligation-service."""
        return {"Authorization": f"Bearer {self._bearer_token()}"}

    async def aclose(self) -> None:
        """Called on app shutdown so the process does not leak sockets."""
        await self._http.aclose()

    async def create_document(self, payload: DocumentCreate) -> DocumentResponse:
        """POST /documents — first step of ingest; returns assigned UUID."""
        t0 = time.perf_counter()
        response = await self._http.post(
            "/documents",
            json=payload.model_dump(mode="json", by_alias=True, exclude_none=True),
            headers=self._write_headers(),
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        if response.is_success:
            logger.info(
                "obligation-service POST /documents -> %s in %.0fms (ref=%s)",
                response.status_code,
                elapsed_ms,
                payload.ref,
            )
        else:
            logger.warning(
                "obligation-service POST /documents -> %s in %.0fms (ref=%s)",
                response.status_code,
                elapsed_ms,
                payload.ref,
            )
        response.raise_for_status()
        return DocumentResponse.model_validate(response.json())

    async def create_obligations_batch(self, items: list[ObligationCreate]) -> list[ObligationResponse]:
        """POST /obligations/batch — one round-trip for the whole stub or LLM extraction output."""
        body = [item.model_dump(mode="json", by_alias=True, exclude_none=True) for item in items]
        t0 = time.perf_counter()
        response = await self._http.post(
            "/obligations/batch",
            json=body,
            headers=self._write_headers(),
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        if response.is_success:
            logger.info(
                "obligation-service POST /obligations/batch -> %s in %.0fms (count=%s)",
                response.status_code,
                elapsed_ms,
                len(items),
            )
        else:
            logger.warning(
                "obligation-service POST /obligations/batch -> %s in %.0fms (count=%s)",
                response.status_code,
                elapsed_ms,
                len(items),
            )
        response.raise_for_status()
        return [ObligationResponse.model_validate(row) for row in response.json()]

    async def list_obligations_for_document(self, document_id: UUID, *, page_size: int = 500) -> list[ObligationResponse]:
        """
        GET /documents/{id}/obligations — same Bearer auth as writes (obligation-service requires authenticated).

        Walks every page until exhausted (rarely more than one page during Phase 1 demos).
        """
        collected: list[ObligationResponse] = []
        page = 0
        t0 = time.perf_counter()
        while True:
            response = await self._http.get(
                f"/documents/{document_id}/obligations",
                params={"page": page, "size": page_size, "sort": "createdAt"},
                headers=self._write_headers(),
            )
            if response.is_success:
                logger.info(
                    "obligation-service GET /documents/%s/obligations page=%s -> %s",
                    document_id,
                    page,
                    response.status_code,
                )
            else:
                logger.warning(
                    "obligation-service GET /documents/%s/obligations page=%s -> %s",
                    document_id,
                    page,
                    response.status_code,
                )
            response.raise_for_status()
            payload = response.json()
            for row in payload.get("content", []):
                collected.append(ObligationResponse.model_validate(row))
            last = payload.get("last", True)
            if last or not payload.get("content"):
                break
            page += 1
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "obligation-service listed obligations for document %s: %s rows in %.0fms",
            document_id,
            len(collected),
            elapsed_ms,
        )
        return collected
