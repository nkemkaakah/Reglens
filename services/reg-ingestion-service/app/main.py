from contextlib import asynccontextmanager
import logging

import anthropic
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.routers import api_router
from app.core.config import settings
from app.services.document_ingested_kafka import close_kafka_producer
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
        settings.obligation_service_token,
    )
    app.state.obligation_client = obligation_client
    app.state.anthropic_client = anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY.strip() or "anthropic-api-key-not-configured",
    )
    try:
        yield
    finally:
        await obligation_client.aclose()
        await app.state.anthropic_client.close()
        close_kafka_producer()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    logging.getLogger(__name__).info("Starting %s", settings.app_name)

    @application.get("/")
    async def root_health() -> dict[str, str]:
        return {"service": settings.app_name, "status": "UP"}

    application.include_router(api_router, prefix="/api")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return application


app = create_app()
