"""
Document ingest + preview routes (Feature 1 — FastAPI side).

Browser or SPA posts multipart form data here; this service registers the document in
obligation-service, runs the stub pipeline, then bulk-writes obligations — all over HTTP.
"""

from __future__ import annotations

import re
from pathlib import Path
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from urllib.parse import urlparse

from app.api.deps import ObligationClientDep
from app.schemas.documents import DocumentCreate, IngestResponse, ObligationResponse
from app.services.stub_pipeline import build_stub_obligations, slug_document_ref_prefix

router = APIRouter()

# Guardrail for accidental huge PDFs during local dev — tune when streaming to object storage.
_MAX_UPLOAD_BYTES = 15 * 1024 * 1024


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


@router.post(
    "",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload (or URL) + stub extraction",
)
async def ingest_document(
    client: ObligationClientDep,
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

    At least one of `file` or `source_url` must be present so the stub has a realistic context label.
    """
    url_clean = _normalise_whitespace(source_url)
    if file is None and url_clean is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Provide a `file` upload and/or a `source_url` form field.",
        )

    context_label: str
    default_ref: str
    default_title: str

    if file is not None:
        _body, fname = await _read_upload_with_limit(file)
        context_label = fname
        stem = Path(fname).stem or "upload"
        default_ref = f"{slug_document_ref_prefix(stem)}-{uuid4().hex[:6].upper()}"
        default_title = re.sub(r"[_-]+", " ", stem).strip() or "Uploaded document"
    else:
        parsed = urlparse(url_clean or "")
        host = parsed.netloc or "SOURCE"
        context_label = url_clean or ""
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

    try:
        created_doc = await client.create_document(document_payload)
        stub_rows = build_stub_obligations(
            document_id=created_doc.id,
            document_ref=created_doc.ref,
            context_label=context_label,
        )
        created_obligations = await client.create_obligations_batch(stub_rows)
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:2000] if exc.response.text else exc.response.reason_phrase
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc

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
    try:
        return await client.list_obligations_for_document(document_id)
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:2000] if exc.response.text else exc.response.reason_phrase
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
