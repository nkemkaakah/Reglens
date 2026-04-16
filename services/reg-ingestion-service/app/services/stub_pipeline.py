"""
Shared helpers for ingestion routes (ref slugging).

Historically held a stub extractor; extraction now lives on the HTTP router module.
"""

from __future__ import annotations

import re


def slug_document_ref_prefix(raw: str) -> str:
    """
    Produce a short, human-readable token for document / obligation `ref` prefixes.

    obligation.ref is UNIQUE globally in Postgres — callers still add random suffixes per run.
    """
    slug = re.sub(r"[^A-Za-z0-9]+", "-", raw.strip()).strip("-").upper()
    return slug[:48] if slug else "DOCUMENT"
