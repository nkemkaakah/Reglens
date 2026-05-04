from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


LLM_MODEL = "claude-haiku-4-5"
LLM_MAX_OUTPUT_TOKENS = 4096


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "reg-ingestion-service"
    debug: bool = False
    obligation_service_base_url: str = "http://localhost:8080"
    obligation_service_token: str = ""
    obligation_service_jwt_sub: str = "reg-ingestion-service"
    obligation_service_jwt_role: str = "ADMIN"
    obligation_service_jwt_ttl_seconds: int = 86400
    ANTHROPIC_API_KEY: str = Field(
        default="",
    )
    kafka_bootstrap_servers: str = ""
    kafka_topic_document_ingested: str = "document.ingested"
    kafka_topic_ingest_requested: str = "document.ingest.requested"
    redis_url: str = "redis://localhost:6379/0"

    @property
    def kafka_enabled(self) -> bool:
        return bool(self.kafka_bootstrap_servers.strip())


settings = Settings()
