"""
Shared Kafka connection kwargs.

When KAFKA_USE_IAM=true (staging/prod MSK on port 9098), negotiates SASL_SSL + OAUTHBEARER
using the AWS MSK IAM signer. Falls back to plain Kafka for local docker-compose on 9092.
"""

from __future__ import annotations

import os

from kafka.sasl.oauth import AbstractTokenProvider

from app.core.config import settings


class _MSKTokenProvider(AbstractTokenProvider):
    def __init__(self, region: str) -> None:
        self._region = region

    def token(self) -> str:
        from aws_msk_iam_sasl_signer import MSKAuthTokenProvider

        token, _ = MSKAuthTokenProvider.generate_auth_token(self._region)
        return token


def kafka_iam_kwargs() -> dict:
    """Return bootstrap_servers + optional SASL_SSL kwargs for all Kafka clients."""
    brokers = [b.strip() for b in settings.kafka_bootstrap_servers.split(",") if b.strip()]
    kwargs: dict = {"bootstrap_servers": brokers}
    if os.getenv("KAFKA_USE_IAM", "").lower() == "true":
        region = os.getenv("AWS_REGION", "eu-north-1")
        kwargs.update(
            security_protocol="SASL_SSL",
            sasl_mechanism="OAUTHBEARER",
            sasl_oauth_token_provider=_MSKTokenProvider(region),
        )
    return kwargs
