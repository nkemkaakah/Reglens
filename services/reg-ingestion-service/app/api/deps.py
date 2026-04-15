"""FastAPI dependencies — shared request-scoped or app-scoped collaborators."""

from typing import Annotated

from fastapi import Depends, Request

from app.services.obligation_client import ObligationClient


def get_obligation_client(request: Request) -> ObligationClient:
    """
    Return the singleton ObligationClient attached during app lifespan.

    Keeping one AsyncClient avoids TCP/TLS handshake overhead on every obligation batch.
    """
    return request.app.state.obligation_client


# Shorthand for routers: `async def route(client: ObligationClientDep): ...`
ObligationClientDep = Annotated[ObligationClient, Depends(get_obligation_client)]
