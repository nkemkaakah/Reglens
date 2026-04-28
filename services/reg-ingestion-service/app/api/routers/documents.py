"""
Document ingest + preview routes (Feature 1 — FastAPI side).

Browser or SPA posts multipart form data here; this service registers the document in
obligation-service, runs text extraction + an LLM pass per chunk, then bulk-writes obligations.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

import anthropic
import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from urllib.parse import urlparse

from app.api.deps import AnthropicClientDep, ObligationClientDep
from app.core.config import LLM_MAX_OUTPUT_TOKENS, LLM_MODEL, settings
from app.schemas.documents import DocumentCreate, IngestResponse, ObligationCreate, ObligationResponse
from app.services.document_ingested_kafka import publish_document_ingested_sync
from app.services.stub_pipeline import slug_document_ref_prefix

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_UPLOAD_BYTES = 15 * 1024 * 1024
_CHUNK_MAX_CHARS = 16_000

_ALLOWED_RISK = frozenset({"LOW", "MEDIUM", "HIGH", "CRITICAL"})


class _LlmObligationItem(BaseModel):
    """One obligation object as returned inside the model JSON envelope."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    ref: str
    title: str
    summary: str
    full_text: str = Field(alias="fullText")
    section_ref: str | None = Field(default=None, alias="sectionRef")
    topics: list[str] | None = None
    ai_principles: list[str] | None = Field(default=None, alias="aiPrinciples")
    risk_rating: str | None = Field(default=None, alias="riskRating")
    effective_date: str | None = Field(default=None, alias="effectiveDate")


class _LlmObligationEnvelope(BaseModel):
    obligations: list[_LlmObligationItem]


# JSON schema for Claude structured outputs (output_config.format).
# All object properties are required; nullables use anyOf per API constraints.
_OBLIGATION_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "obligations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ref": {"type": "string"},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "fullText": {"type": "string"},
                    "sectionRef": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    "topics": {"type": "array", "items": {"type": "string"}},
                    "aiPrinciples": {"type": "array", "items": {"type": "string"}},
                    "riskRating": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    "effectiveDate": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                },
                "required": [
                    "ref",
                    "title",
                    "summary",
                    "fullText",
                    "sectionRef",
                    "topics",
                    "aiPrinciples",
                    "riskRating",
                    "effectiveDate",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["obligations"],
    "additionalProperties": False,
}


async def _read_upload_with_limit(upload: UploadFile) -> tuple[bytes, str]:
    """Read the whole upload into memory with a hard cap — good enough until S3-style storage."""
    chunks: list[bytes] = []
    total = 0
    while True:
        block = await upload.read(1024 * 1024)
        if not block:
            break
        total += len(block)
        if total > _MAX_UPLOAD_BYTES:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File exceeds maximum size of {_MAX_UPLOAD_BYTES // (1024 * 1024)} MiB",
            )
        chunks.append(block)
    label = upload.filename or "upload.bin"
    return b"".join(chunks), label


def _normalise_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


async def _read_url_body(url: str) -> tuple[bytes, str | None]:
    """Fetch remote document bytes with size cap (mirrors upload guardrail)."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type")
            chunks: list[bytes] = []
            total = 0
            async for block in response.aiter_bytes():
                total += len(block)
                if total > _MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status.HTTP_413_CONTENT_TOO_LARGE,
                        detail=f"Downloaded content exceeds maximum size of {_MAX_UPLOAD_BYTES // (1024 * 1024)} MiB",
                    )
                chunks.append(block)
            return b"".join(chunks), content_type


def _decode_text_lossy(body: bytes) -> str:
    return body.decode("utf-8", errors="replace")


def _strip_html_to_text(html: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", without_tags).strip()


def _plain_text_from_bytes(body: bytes, filename: str, content_type: str | None) -> str:
    """Turn raw bytes into plain text suitable for chunking (PDF, text, crude HTML)."""
    name = (filename or "").lower()
    ct = (content_type or "").lower()

    if name.endswith(".pdf") or "application/pdf" in ct:
        try:
            reader = PdfReader(BytesIO(body))
            parts: list[str] = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            text = "\n".join(parts).strip()
        except PdfReadError as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not read PDF — file may be corrupt or not a valid PDF.",
            ) from exc
        if not text:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No extractable text found in PDF (empty or image-only).",
            )
        return text

    if "html" in ct or name.endswith((".html", ".htm")):
        raw = _decode_text_lossy(body)
        stripped = _strip_html_to_text(raw)
        if not stripped:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No extractable text found in HTML.",
            )
        return stripped

    text = _decode_text_lossy(body).strip()
    if not text:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No extractable text found in uploaded file.",
        )
    return text


def _split_text_into_chunks(text: str, max_chars: int = _CHUNK_MAX_CHARS) -> list[str]:
    """Split plain text into fixed-size character slices (default 16k)."""
    normalized = text.strip()
    if not normalized:
        return []
    if len(normalized) <= max_chars:
        return [normalized]
    return [normalized[i : i + max_chars] for i in range(0, len(normalized), max_chars)]


def _parse_optional_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None


def _normalize_risk(value: str | None) -> str | None:
    if not value:
        return None
    upper = value.strip().upper()
    return upper if upper in _ALLOWED_RISK else None


def _stable_row_ref(*, document_ref: str, chunk_index: int, row_index: int) -> str:
    base = slug_document_ref_prefix(document_ref)
    token = uuid4().hex[:8].upper()
    return f"{base}-C{chunk_index:03d}-R{row_index:03d}-{token}"


def _llm_item_to_obligation_create(
    *,
    document_id: UUID,
    document_ref: str,
    chunk_index: int,
    row_index: int,
    item: _LlmObligationItem,
) -> ObligationCreate:
    return ObligationCreate(
        document_id=document_id,
        ref=_stable_row_ref(document_ref=document_ref, chunk_index=chunk_index, row_index=row_index),
        title=item.title.strip(),
        summary=item.summary.strip(),
        full_text=item.full_text.strip(),
        section_ref=item.section_ref.strip() if item.section_ref else None,
        topics=item.topics,
        ai_principles=item.ai_principles,
        risk_rating=_normalize_risk(item.risk_rating),
        effective_date=_parse_optional_date(item.effective_date),
        status="UNMAPPED",
    )


async def _complete_chat_for_structured_obligations(
    *,
    chunk_text: str,
    chunk_index: int,
    regulator: str,
    document_title: str,
    anthropic_client: anthropic.AsyncAnthropic,
) -> list[_LlmObligationItem]:
    """Call the configured chat model and parse structured obligations JSON for one chunk."""
    if not settings.ANTHROPIC_API_KEY.strip():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM is not configured: set ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.",
        )

    system = (
        "You are a regulatory compliance analyst. "
        "Extract discrete, reviewable obligations from the provided document chunk. "
        "Each obligation must be a concrete requirement with a clear owner or action. "
        "If the chunk contains no obligations, return an empty obligations array. "
        "Use riskRating as one of: LOW, MEDIUM, HIGH, CRITICAL, or null. "
        "Use effectiveDate as YYYY-MM-DD string or null. "
        "The ref field is replaced server-side — any non-empty string is acceptable."
    )
    user = (
        f"Document title: {document_title}\n"
        f"Regulator context: {regulator}\n"
        f"Chunk index: {chunk_index}\n\n"
        f"---\n{chunk_text}\n---"
    )

    try:
        message = await anthropic_client.messages.create(
            model=LLM_MODEL,
            max_tokens=LLM_MAX_OUTPUT_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": _OBLIGATION_JSON_SCHEMA,
                }
            },
        )
    except anthropic.APIError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream language model error: {exc}",
        ) from exc

    if message.stop_reason == "refusal":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Model refused to extract obligations for this content.",
        )
    if message.stop_reason == "max_tokens":
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Model hit token limit during extraction — try a smaller chunk or increase LLM_MAX_OUTPUT_TOKENS.",
        )

    parts: list[str] = []
    for block in message.content:
        if block.type == "text":
            parts.append(block.text)
    text = "".join(parts).strip()
    if not text:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Empty response from language model.",
        )
    try:
        data = json.loads(text)
        envelope = _LlmObligationEnvelope.model_validate(data)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Model returned invalid JSON for obligations extraction.",
        ) from exc
    except ValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Model JSON did not match expected schema: {exc}",
        ) from exc
    return envelope.obligations


async def collect_structured_obligations_from_source(
    *,
    regulator: str,
    document_title: str,
    source_body: bytes,
    source_label: str,
    content_type: str | None,
    anthropic_client: anthropic.AsyncAnthropic,
) -> list[tuple[int, _LlmObligationItem]]:
    """
    Bytes → plain text → chunks → model. Returns (chunk_index, item) pairs in order.

    Runs **before** persisting the document so a failed extraction does not orphan a `documents` row.
    Exposed at module scope so tests can monkeypatch without calling a real model.
    """
    plain = _plain_text_from_bytes(source_body, filename=source_label, content_type=content_type)
    chunks = _split_text_into_chunks(plain)
    logger.info(
        "extraction: plain_text chars=%s chunks=%s label=%s",
        len(plain),
        len(chunks),
        source_label[:120] if source_label else "",
    )
    pairs: list[tuple[int, _LlmObligationItem]] = []
    for idx, chunk in enumerate(chunks):
        items = await _complete_chat_for_structured_obligations(
            chunk_text=chunk,
            chunk_index=idx,
            regulator=regulator,
            document_title=document_title,
            anthropic_client=anthropic_client,
        )
        for item in items:
            pairs.append((idx, item))
    if not pairs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No obligations extracted — try a richer document or adjust the model prompt.",
        )
    logger.info("extraction: structured obligation rows=%s", len(pairs))
    return pairs


def map_collected_items_to_creates(
    *,
    document_id: UUID,
    document_ref: str,
    pairs: list[tuple[int, _LlmObligationItem]],
) -> list[ObligationCreate]:
    """Attach persisted document id/refs to structured rows for Spring batch create."""
    out: list[ObligationCreate] = []
    for row_index, (chunk_index, item) in enumerate(pairs):
        out.append(
            _llm_item_to_obligation_create(
                document_id=document_id,
                document_ref=document_ref,
                chunk_index=chunk_index,
                row_index=row_index,
                item=item,
            )
        )
    return out


@router.post(
    "",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload (or URL) + LLM obligation extraction",
)
async def ingest_document(
    client: ObligationClientDep,
    anthropic_client: AnthropicClientDep,
    file: UploadFile | None = File(None, description="PDF or text file to ingest"),
    source_url: str | None = Form(None, description="Optional regulatory URL when no file is attached"),
    ref: str | None = Form(None, description="Stable document code — generated from filename if omitted"),
    title: str | None = Form(None, description="Human title — defaults from filename or URL"),
    regulator: str | None = Form("FCA"),
    doc_type: str | None = Form(None),
    ingested_by: str | None = Form("reg-ingestion-service@reglens"),
) -> IngestResponse:
    """
    Accepts multipart form: optional `file`, optional `source_url`, plus metadata fields.

    At least one of `file` or `source_url` must be present.
    """
    url_clean = _normalise_whitespace(source_url)
    if file is None and url_clean is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Provide a `file` upload and/or a `source_url` form field.",
        )

    default_ref: str
    default_title: str
    source_body: bytes
    source_label: str
    content_type: str | None

    if file is not None:
        source_body, source_label = await _read_upload_with_limit(file)
        content_type = file.content_type
        stem = Path(source_label).stem or "upload"
        default_ref = f"{slug_document_ref_prefix(stem)}-{uuid4().hex[:6].upper()}"
        default_title = re.sub(r"[_-]+", " ", stem).strip() or "Uploaded document"
    else:
        source_body, content_type = await _read_url_body(url_clean or "")
        source_label = url_clean or "url"
        parsed = urlparse(url_clean or "")
        host = parsed.netloc or "SOURCE"
        default_ref = f"{slug_document_ref_prefix(host)}-URL-{uuid4().hex[:6].upper()}"
        default_title = f"Imported — {host}"

    doc_ref = _normalise_whitespace(ref) or default_ref
    doc_title = _normalise_whitespace(title) or default_title
    reg = _normalise_whitespace(regulator) or "FCA"

    document_payload = DocumentCreate(
        ref=doc_ref,
        title=doc_title,
        regulator=reg,
        doc_type=_normalise_whitespace(doc_type),
        url=url_clean,
        ingested_by=_normalise_whitespace(ingested_by),
    )

    logger.info(
        "ingest: start has_file=%s has_url=%s ref=%s regulator=%s",
        file is not None,
        bool(url_clean),
        doc_ref,
        reg,
    )

    try:
        structured_pairs = await collect_structured_obligations_from_source(
            regulator=reg,
            document_title=doc_title,
            source_body=source_body,
            source_label=source_label,
            content_type=content_type,
            anthropic_client=anthropic_client,
        )
        created_doc = await client.create_document(document_payload)
        logger.info(
            "ingest: document registered id=%s ref=%s (obligation rows to persist=%s)",
            created_doc.id,
            created_doc.ref,
            len(structured_pairs),
        )
        obligation_rows = map_collected_items_to_creates(
            document_id=created_doc.id,
            document_ref=created_doc.ref,
            pairs=structured_pairs,
        )
        created_obligations = await client.create_obligations_batch(obligation_rows)
        try:
            publish_document_ingested_sync(
                document_id=created_doc.id,
                obligation_ids=[o.id for o in created_obligations],
                ingested_by=document_payload.ingested_by,
            )
        except Exception as kafka_exc:  # noqa: BLE001 — audit fan-out must not fail the ingest HTTP transaction
            logger.warning(
                "ingest: document.ingested Kafka publish failed document_id=%s: %s",
                created_doc.id,
                kafka_exc,
            )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "ingest: obligation-service HTTP %s for %s",
            exc.response.status_code,
            exc.request.url,
        )
        detail = exc.response.text[:2000] if exc.response.text else exc.response.reason_phrase
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc

    logger.info(
        "ingest: complete document_id=%s ref=%s obligations=%s",
        created_doc.id,
        created_doc.ref,
        len(created_obligations),
    )

    return IngestResponse(
        document=created_doc,
        obligations=created_obligations,
        obligation_count=len(created_obligations),
    )


@router.get(
    "/{document_id}/obligations",
    response_model=list[ObligationResponse],
    summary="Preview obligations persisted for a document",
)
async def list_obligations_for_document(
    document_id: UUID,
    client: ObligationClientDep,
) -> list[ObligationResponse]:
    """
    Thin proxy over Spring GET /documents/{id}/obligations — used by the SPA for polling/preview.

    Pagination is handled inside ObligationClient so this route always returns a flat list.
    """
    logger.info("preview: list obligations for document_id=%s", document_id)
    try:
        rows = await client.list_obligations_for_document(document_id)
        logger.info("preview: returning %s obligations for document_id=%s", len(rows), document_id)
        return rows
    except httpx.HTTPStatusError as exc:
        logger.error(
            "preview: obligation-service HTTP %s for document_id=%s",
            exc.response.status_code,
            document_id,
        )
        detail = exc.response.text[:2000] if exc.response.text else exc.response.reason_phrase
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
