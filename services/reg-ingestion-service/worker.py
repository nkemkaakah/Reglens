"""
Standalone Kafka consumer: processes `document.ingest.requested` using the same pipeline as the API.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from uuid import UUID

import anthropic
import httpx
from fastapi import HTTPException
from kafka import KafkaConsumer
from redis import Redis

from app.api.routers.documents import (
    collect_structured_obligations_from_source,
    map_collected_items_to_creates,
)
from app.core.config import settings
from app.schemas.documents import DocumentCreate
from app.services.document_ingested_kafka import publish_document_ingested_sync
from app.services.kafka_client import kafka_iam_kwargs
from app.services.job_store import (
    configure_job_store,
    delete_source_bytes,
    get_source_bytes,
    set_job_status,
)
from app.services.obligation_client import ObligationClient

logger = logging.getLogger(__name__)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def run_ingest_for_message(job: dict) -> None:
    job_id = UUID(job["jobId"])
    set_job_status(job_id, status="PROCESSING")

    source_bytes = get_source_bytes(job_id)
    if source_bytes is None:
        set_job_status(
            job_id,
            status="FAILED",
            error="Source bytes missing or expired",
            completed_at=_utc_iso(),
        )
        return

    document_payload = DocumentCreate(
        ref=job["ref"],
        title=job["title"],
        regulator=job.get("regulator") or "FCA",
        doc_type=job.get("docType"),
        url=job.get("sourceUrl"),
        ingested_by=job.get("ingestedBy"),
    )

    client = ObligationClient(
        settings.obligation_service_base_url,
        service_token=settings.obligation_service_token,
        jwt_sub=settings.obligation_service_jwt_sub,
        jwt_role=settings.obligation_service_jwt_role,
        jwt_ttl_seconds=settings.obligation_service_jwt_ttl_seconds,
    )
    anthropic_client = anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY.strip() or "anthropic-api-key-not-configured",
    )
    try:
        try:
            structured_pairs = await collect_structured_obligations_from_source(
                regulator=document_payload.regulator,
                document_title=document_payload.title,
                source_body=source_bytes,
                source_label=job.get("sourceLabel") or "upload",
                content_type=job.get("contentType"),
                anthropic_client=anthropic_client,
            )
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            set_job_status(
                job_id,
                status="FAILED",
                error=detail[:500],
                completed_at=_utc_iso(),
            )
            return

        created_doc = await client.create_document(document_payload)
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
        except Exception as kafka_exc:  # noqa: BLE001
            logger.warning(
                "worker: document.ingested Kafka publish failed document_id=%s: %s",
                created_doc.id,
                kafka_exc,
            )

        set_job_status(
            job_id,
            status="COMPLETED",
            document_id=str(created_doc.id),
            obligation_count=len(created_obligations),
            completed_at=_utc_iso(),
        )
        delete_source_bytes(job_id)
        logger.info(
            "worker: completed job_id=%s document_id=%s obligations=%s",
            job_id,
            created_doc.id,
            len(created_obligations),
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response.text else exc.response.reason_phrase
        set_job_status(
            job_id,
            status="FAILED",
            error=detail[:500],
            completed_at=_utc_iso(),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("worker: ingest failed job_id=%s", job_id)
        set_job_status(
            job_id,
            status="FAILED",
            error=str(exc)[:500],
            completed_at=_utc_iso(),
        )
    finally:
        await client.aclose()
        await anthropic_client.close()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    if not settings.kafka_enabled:
        logger.error("Set KAFKA_BOOTSTRAP_SERVERS to run the ingestion worker.")
        sys.exit(1)

    configure_job_store(Redis.from_url(settings.redis_url))

    consumer = KafkaConsumer(
        settings.kafka_topic_ingest_requested,
        group_id="reg-ingestion-workers",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        **kafka_iam_kwargs(),
    )
    logger.info("Worker subscribed topic=%s brokers=%s", settings.kafka_topic_ingest_requested, brokers)

    for message in consumer:
        try:
            asyncio.run(run_ingest_for_message(message.value))
        except Exception as exc:  # noqa: BLE001
            logger.exception("worker: fatal loop error: %s", exc)


if __name__ == "__main__":
    main()
