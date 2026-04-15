from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import api_router
from app.core.config import settings
from app.services.obligation_client import ObligationClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Open shared outbound HTTP resources once per process.

    obligation-service is called on every ingest — reusing AsyncClient avoids repeated TCP setup.
    """
    app.state.obligation_client = ObligationClient(
        settings.obligation_service_base_url,
        settings.obligation_service_token,
    )
    yield
    await app.state.obligation_client.aclose()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )

    # SPA on Vite default port talks to this API directly during Phase 1 (no BFF yet).
    _origins = [o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()]
    if _origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=_origins,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["*"],
            allow_credentials=False,
        )

    application.include_router(api_router, prefix="/api")
    return application


app = create_app()
