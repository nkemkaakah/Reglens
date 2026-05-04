"""ObligationClient HTTP behaviour — outbound calls mocked with respx."""

import base64
import json
from uuid import UUID

import httpx
import pytest
import pytest_asyncio
import respx

from app.schemas.documents import DocumentCreate, ObligationCreate, ObligationResponse
from app.services.obligation_client import ObligationClient

BASE = "http://obligation.test"
TOKEN = "test-token"


@pytest_asyncio.fixture
async def client() -> ObligationClient:
    c = ObligationClient(BASE, service_token=TOKEN)
    yield c
    await c.aclose()


@respx.mock
async def test_create_document_posts_json_and_bearer(client: ObligationClient) -> None:
    route = respx.post(f"{BASE}/documents").mock(
        return_value=httpx.Response(
            201,
            json={
                "id": "d1000000-0000-0000-0000-000000000001",
                "ref": "R",
                "title": "T",
                "regulator": "FCA",
                "docType": None,
                "url": None,
                "publishedDate": None,
                "effectiveDate": None,
                "status": "ACTIVE",
                "topics": None,
                "ingestedAt": "2024-01-15T10:00:00+00:00",
                "ingestedBy": "x",
            },
        )
    )

    payload = DocumentCreate(ref="R", title="T", regulator="FCA")
    result = await client.create_document(payload)

    assert result.id == UUID("d1000000-0000-0000-0000-000000000001")
    assert route.called
    sent = route.calls.last.request
    assert sent.headers["Authorization"] == f"Bearer {TOKEN}"

    body = json.loads(sent.content.decode())
    assert body["ref"] == "R"
    assert body["title"] == "T"


@respx.mock
async def test_create_document_sends_runtime_demo_jwt_when_no_service_token() -> None:
    route = respx.post(f"{BASE}/documents").mock(
        return_value=httpx.Response(
            201,
            json={
                "id": "d1000000-0000-0000-0000-000000000001",
                "ref": "R",
                "title": "T",
                "regulator": "FCA",
                "docType": None,
                "url": None,
                "publishedDate": None,
                "effectiveDate": None,
                "status": "ACTIVE",
                "topics": None,
                "ingestedAt": "2024-01-15T10:00:00+00:00",
                "ingestedBy": "x",
            },
        )
    )
    client = ObligationClient(BASE)
    try:
        await client.create_document(DocumentCreate(ref="R", title="T", regulator="FCA"))
    finally:
        await client.aclose()

    auth = route.calls.last.request.headers["Authorization"]
    assert auth.startswith("Bearer ")
    token = auth.removeprefix("Bearer ").strip()
    parts = token.split(".")
    assert len(parts) == 3
    assert parts[2] == "local-signature"
    pad = "=" * ((4 - len(parts[1]) % 4) % 4)
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + pad))
    assert payload["iss"] == "https://demo.reglens.io"
    assert payload["aud"] == "https://api.reglens.io"
    assert payload["sub"] == "reg-ingestion-service"
    assert payload["https://reglens.io/role"] == "ADMIN"


@respx.mock
async def test_create_obligations_batch_sends_array(client: ObligationClient) -> None:
    did = UUID("d1000000-0000-0000-0000-000000000001")
    route = respx.post(f"{BASE}/obligations/batch").mock(
        return_value=httpx.Response(
            201,
            json=[
                {
                    "id": "e1000000-0000-0000-0000-000000000001",
                    "documentId": str(did),
                    "documentRef": "DR",
                    "documentTitle": "DT",
                    "regulator": "FCA",
                    "ref": "O1",
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
            ],
        )
    )

    items = [
        ObligationCreate(
            document_id=did,
            ref="O1",
            title="t",
            summary="s",
            full_text="f",
        )
    ]
    out = await client.create_obligations_batch(items)
    assert len(out) == 1
    assert isinstance(out[0], ObligationResponse)

    body = json.loads(route.calls.last.request.content.decode())
    assert isinstance(body, list)
    assert body[0]["documentId"] == str(did)
    assert body[0]["fullText"] == "f"


@respx.mock
async def test_list_obligations_follows_pagination_until_last(client: ObligationClient) -> None:
    did = UUID("d1000000-0000-0000-0000-000000000001")
    row = {
        "id": "e1000000-0000-0000-0000-000000000001",
        "documentId": str(did),
        "documentRef": "DR",
        "documentTitle": "DT",
        "regulator": "FCA",
        "ref": "O1",
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

    # Same path is called twice with different page= query params — side_effect consumes in order.
    route = respx.get(f"{BASE}/documents/{did}/obligations").mock(
        side_effect=[
            httpx.Response(200, json={"content": [row], "last": False}),
            httpx.Response(200, json={"content": [row], "last": True}),
        ]
    )

    out = await client.list_obligations_for_document(did, page_size=500)
    assert len(out) == 2
    assert route.call_count == 2
    assert route.calls[0].request.headers["Authorization"] == f"Bearer {TOKEN}"
    assert route.calls[1].request.headers["Authorization"] == f"Bearer {TOKEN}"
