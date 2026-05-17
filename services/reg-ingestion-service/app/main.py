from contextlib import asynccontextmanager
import logging

import anthropic
from fastapi import FastAPI
from redis import Redis

from app.api.routers import api_router
from app.core.config import settings
from app.services.document_ingested_kafka import close_kafka_producer
from app.services.ingest_queue import close_ingest_queue_producer
from app.services.job_store import configure_job_store
from app.services.obligation_client import ObligationClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    obligation_client = ObligationClient(
        settings.obligation_service_base_url,
        service_token=settings.obligation_service_token,
        jwt_sub=settings.obligation_service_jwt_sub,
        jwt_role=settings.obligation_service_jwt_role,
        jwt_ttl_seconds=settings.obligation_service_jwt_ttl_seconds,
    )
    redis_client = Redis.from_url(settings.redis_url)
    configure_job_store(redis_client)
    app.state.obligation_client = obligation_client
    app.state.redis = redis_client
    app.state.anthropic_client = anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY.strip() or "anthropic-api-key-not-configured",
    )
    try:
        yield
    finally:
        await obligation_client.aclose()
        await app.state.anthropic_client.close()
        close_kafka_producer()
        close_ingest_queue_producer()
        redis_client.close()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    logging.getLogger(__name__).info("Starting %s", settings.app_name)

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"service": settings.app_name, "status": "UP"}

    application.include_router(api_router, prefix="/api")
    return application


app = create_app()
