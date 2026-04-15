from fastapi import APIRouter

from . import documents

api_router = APIRouter()
# upload + preview; each router module stays small and testable.
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
