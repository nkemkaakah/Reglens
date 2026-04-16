"""FastAPI dependencies (e.g. obligation-service HTTP client)."""

from __future__ import annotations

from typing import Annotated

import anthropic
from fastapi import Depends, Request

from app.services.obligation_client import ObligationClient


def get_obligation_client(request: Request) -> ObligationClient:
    """Returns the shared async client created in ``app.main`` lifespan."""
    return request.app.state.obligation_client


def get_anthropic_client(request: Request) -> anthropic.AsyncAnthropic:
    """Returns the shared Anthropic client created in ``app.main`` lifespan."""
    return request.app.state.anthropic_client


ObligationClientDep = Annotated[ObligationClient, Depends(get_obligation_client)]
AnthropicClientDep = Annotated[anthropic.AsyncAnthropic, Depends(get_anthropic_client)]
