"""
Redis-backed ingest queue: raw source bytes (short TTL) + job status hash (longer TTL).
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from redis import Redis

SOURCE_TTL_SEC = 3600
JOB_TTL_SEC = 86400

_redis: Redis | None = None


def configure_job_store(client: Redis) -> None:
    global _redis
    _redis = client


def _client() -> Redis:
    if _redis is None:
        raise RuntimeError("job store not configured")
    return _redis


def _source_key(job_id: UUID) -> str:
    return f"ingest:source:{job_id}"


def _job_key(job_id: UUID) -> str:
    return f"ingest:job:{job_id}"


def create_job(job_id: UUID, source_bytes: bytes) -> None:
    r = _client()
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    source_key = _source_key(job_id)
    job_key = _job_key(job_id)
    pipe = r.pipeline()
    pipe.setex(source_key, SOURCE_TTL_SEC, source_bytes)
    pipe.hset(job_key, mapping={"status": "PENDING", "createdAt": now})
    pipe.expire(job_key, JOB_TTL_SEC)
    pipe.execute()


def set_job_status(
    job_id: UUID,
    *,
    status: str | None = None,
    document_id: str | None = None,
    obligation_count: int | None = None,
    error: str | None = None,
    completed_at: str | None = None,
) -> None:
    r = _client()
    job_key = _job_key(job_id)
    mapping: dict[str, str] = {}
    if status is not None:
        mapping["status"] = status
    if document_id is not None:
        mapping["documentId"] = document_id
    if obligation_count is not None:
        mapping["obligationCount"] = str(obligation_count)
    if error is not None:
        mapping["error"] = error
    if completed_at is not None:
        mapping["completedAt"] = completed_at
    if not mapping:
        return
    r.hset(job_key, mapping=mapping)


def get_job(job_id: UUID) -> dict[str, str] | None:
    r = _client()
    raw = r.hgetall(_job_key(job_id))
    if not raw:
        return None
    out: dict[str, str] = {}
    for k, v in raw.items():
        key = k.decode("utf-8") if isinstance(k, bytes) else k
        val = v.decode("utf-8") if isinstance(v, bytes) else v
        out[key] = val
    return out


def get_source_bytes(job_id: UUID) -> bytes | None:
    r = _client()
    blob = r.get(_source_key(job_id))
    if blob is None:
        return None
    return blob if isinstance(blob, bytes) else blob.encode("latin-1")


def delete_source_bytes(job_id: UUID) -> None:
    _client().delete(_source_key(job_id))


def delete_job_keys(job_id: UUID) -> None:
    """Remove source blob and job hash (e.g. rollback after failed enqueue)."""
    _client().delete(_source_key(job_id), _job_key(job_id))
