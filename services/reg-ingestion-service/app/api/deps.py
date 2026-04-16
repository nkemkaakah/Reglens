"""FastAPI dependencies (e.g. obligation-service HTTP client)."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.services.obligation_client import ObligationClient


def get_obligation_client(request: Request) -> ObligationClient:
    """Returns the shared async client created in ``app.main`` lifespan."""
    return request.app.state.obligation_client


ObligationClientDep = Annotated[ObligationClient, Depends(get_obligation_client)]
