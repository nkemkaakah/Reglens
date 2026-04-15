from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "reg-ingestion-service"
    debug: bool = False
    obligation_service_base_url: str = "http://localhost:8080"
    obligation_service_token: str = "dev-service-token-change-me"
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
