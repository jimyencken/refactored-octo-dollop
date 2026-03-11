from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Productivity Assistant"
    database_url: str = "sqlite+aiosqlite:///./productivity.db"
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_email: str = "mailto:admin@example.com"
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    llm_api_key: str = ""
    llm_base_url: str = ""
    timezone: str = "UTC"
    port: int = 8000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
