"""
Pydantic models shared with obligation-service JSON payloads.

Spring Boot serialises Java records with camelCase field names (Jackson default).
We use Field(alias=...) plus populate_by_name=True so we can:
  - parse camelCase responses from Spring into snake_case Python attributes
  - build Python objects naturally, then model_dump(..., by_alias=True) for outbound JSON.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    """
    Outbound body for Spring POST /documents — registers metadata before obligations exist.

    Mirrors com.reglens.obligation_service.dto.DocumentRequest in the Java service.
    """

    model_config = ConfigDict(populate_by_name=True)

    ref: str
    title: str
    regulator: str
    doc_type: str | None = Field(default=None, alias="docType")
    url: str | None = None
    published_date: date | None = Field(default=None, alias="publishedDate")
    effective_date: date | None = Field(default=None, alias="effectiveDate")
    topics: list[str] | None = None
    ingested_by: str | None = Field(default=None, alias="ingestedBy")


class DocumentResponse(BaseModel):
    """Inbound parse of Spring GET/POST /documents response (DocumentResponse record)."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    ref: str
    title: str
    regulator: str
    doc_type: str | None = Field(default=None, alias="docType")
    url: str | None = None
    published_date: date | None = Field(default=None, alias="publishedDate")
    effective_date: date | None = Field(default=None, alias="effectiveDate")
    status: str
    topics: list[str] | None = None
    ingested_at: datetime = Field(alias="ingestedAt")
    ingested_by: str = Field(alias="ingestedBy")


class ObligationCreate(BaseModel):
    """
    One row in the JSON array for Spring POST /obligations/batch.

    Mirrors ObligationRequest — the ingestion pipeline fills these after extraction (stub or LLM).
    """

    model_config = ConfigDict(populate_by_name=True)

    document_id: UUID = Field(alias="documentId")
    ref: str
    title: str
    summary: str
    full_text: str = Field(alias="fullText")
    section_ref: str | None = Field(default=None, alias="sectionRef")
    topics: list[str] | None = None
    ai_principles: list[str] | None = Field(default=None, alias="aiPrinciples")
    risk_rating: str | None = Field(default=None, alias="riskRating")
    effective_date: date | None = Field(default=None, alias="effectiveDate")
    status: str | None = Field(default="UNMAPPED")


class ObligationResponse(BaseModel):
    """Single obligation as returned by Spring (explorer + batch create responses)."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    document_id: UUID = Field(alias="documentId")
    document_ref: str = Field(alias="documentRef")
    document_title: str = Field(alias="documentTitle")
    regulator: str
    ref: str
    title: str
    summary: str
    full_text: str = Field(alias="fullText")
    section_ref: str | None = Field(default=None, alias="sectionRef")
    topics: list[str] | None = None
    ai_principles: list[str] | None = Field(default=None, alias="aiPrinciples")
    risk_rating: str | None = Field(default=None, alias="riskRating")
    effective_date: date | None = Field(default=None, alias="effectiveDate")
    status: str
    triaged_by: str | None = Field(default=None, alias="triagedBy")
    triaged_at: datetime | None = Field(default=None, alias="triagedAt")
    created_at: datetime = Field(alias="createdAt")


class IngestResponse(BaseModel):
    """
    FastAPI-only envelope returned to the SPA after a successful ingest run.

    Ties together the persisted document row and every obligation written in the same request.
    """

    document: DocumentResponse
    obligations: list[ObligationResponse]
    obligation_count: int


class IngestJobAccepted(BaseModel):
    """Returned when an ingest is accepted for async processing."""

    job_id: UUID
    status: str
    message: str


class IngestJobStatus(BaseModel):
    """Poll response for async ingest job state."""

    job_id: UUID
    status: str
    document_id: UUID | None = None
    obligation_count: int | None = None
    error: str | None = None
    created_at: str
    completed_at: str | None = None
