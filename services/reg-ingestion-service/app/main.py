from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routers import api_router
from app.core.config import settings
from app.services.obligation_client import ObligationClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = ObligationClient(
        settings.obligation_service_base_url,
        settings.obligation_service_token,
    )
    app.state.obligation_client = client
    try:
        yield
    finally:
        await client.aclose()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    application.include_router(api_router, prefix="/api")
    return application


app = create_app()
