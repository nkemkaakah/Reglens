"""
Kafka producer for `document.ingest.requested` (async ingest queue).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from kafka import KafkaProducer

from app.core.config import settings

logger = logging.getLogger(__name__)

_ingest_requested_kafka_producer: KafkaProducer | None = None


def _get_ingest_requested_kafka_producer() -> KafkaProducer | None:
    global _ingest_requested_kafka_producer
    if not settings.kafka_enabled:
        return None
    if _ingest_requested_kafka_producer is None:
        brokers = [b.strip() for b in settings.kafka_bootstrap_servers.split(",") if b.strip()]
        _ingest_requested_kafka_producer = KafkaProducer(
            bootstrap_servers=brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            linger_ms=5,
        )
        logger.info("Kafka producer initialised for document.ingest.requested (brokers=%s)", brokers)
    return _ingest_requested_kafka_producer


def close_ingest_queue_producer() -> None:
    global _ingest_requested_kafka_producer
    if _ingest_requested_kafka_producer is not None:
        try:
            _ingest_requested_kafka_producer.flush(timeout=10)
            _ingest_requested_kafka_producer.close(timeout=10)
        finally:
            _ingest_requested_kafka_producer = None
            logger.info("Kafka ingest-request producer closed")


def publish_ingest_requested_sync(
    *,
    job_id: UUID,
    source_label: str,
    content_type: str | None,
    ref: str,
    title: str,
    regulator: str,
    doc_type: str | None,
    source_url: str | None,
    ingested_by: str | None,
) -> None:
    if not settings.kafka_enabled:
        return
    p = _get_ingest_requested_kafka_producer()
    if p is None:
        return
    requested_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload: dict[str, Any] = {
        "jobId": str(job_id),
        "storageKey": f"ingest:source:{job_id}",
        "sourceLabel": source_label,
        "contentType": content_type,
        "ref": ref,
        "title": title,
        "regulator": regulator,
        "docType": doc_type,
        "sourceUrl": source_url,
        "ingestedBy": (ingested_by or "").strip() or "reg-ingestion-service@reglens",
        "requestedAt": requested_at,
    }
    p.send(settings.kafka_topic_ingest_requested, key=str(job_id), value=payload)
    p.flush(timeout=10)
    logger.info("Kafka document.ingest.requested published job_id=%s", job_id)
