from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


LLM_MODEL = "claude-haiku-4-5"
LLM_MAX_OUTPUT_TOKENS = 4096


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "reg-ingestion-service"
    debug: bool = False
    obligation_service_base_url: str = "http://localhost:8080"
    obligation_service_token: str = "dev-service-token-change-me"
    ANTHROPIC_API_KEY: str = Field(
        default="",
    )


settings = Settings()
