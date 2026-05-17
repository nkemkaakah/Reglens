"""
Best-effort publish of `document.ingested` after obligations are persisted (one event per document).

Workflow-service stores one Mongo row keyed by `eventId` with `obligationIds` for obligation timelines.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from kafka import KafkaProducer

from app.core.config import settings
from app.services.kafka_client import kafka_iam_kwargs

logger = logging.getLogger(__name__)

_document_ingested_kafka_producer: KafkaProducer | None = None


def _get_document_ingested_kafka_producer() -> KafkaProducer | None:
    global _document_ingested_kafka_producer
    if not settings.kafka_enabled:
        return None
    if _document_ingested_kafka_producer is None:
        _document_ingested_kafka_producer = KafkaProducer(
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            linger_ms=5,
            **kafka_iam_kwargs(),
        )
        logger.info("Kafka producer initialised for document.ingested (brokers=%s)", settings.kafka_bootstrap_servers)
    return _document_ingested_kafka_producer


def close_kafka_producer() -> None:
    global _document_ingested_kafka_producer
    if _document_ingested_kafka_producer is not None:
        try:
            _document_ingested_kafka_producer.flush(timeout=10)
            _document_ingested_kafka_producer.close(timeout=10)
        finally:
            _document_ingested_kafka_producer = None
            logger.info("Kafka producer closed")


def publish_document_ingested_sync(
    *,
    document_id: UUID,
    obligation_ids: list[UUID],
    ingested_by: str | None,
) -> None:
    if not settings.kafka_enabled:
        return
    p = _get_document_ingested_kafka_producer()
    if p is None:
        return
    payload: dict[str, Any] = {
        "eventId": str(uuid4()),
        "documentId": str(document_id),
        "obligationIds": [str(x) for x in obligation_ids],
        "ingestedBy": (ingested_by or "").strip() or "reg-ingestion-service@reglens",
        "occurredAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    p.send(settings.kafka_topic_document_ingested, key=str(document_id), value=payload)
    p.flush(timeout=10)
    logger.info(
        "Kafka document.ingested published document_id=%s obligations=%s",
        document_id,
        len(obligation_ids),
    )
