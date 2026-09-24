from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repository root (parent of backend/)
REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", Path(".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "Heart Health AI"
    app_version: str = "1.0.0"

    database_url: str = "sqlite:///./heart_health.db"

    jwt_secret: str = "change-this-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )

    model_path: str = "./ml/models/best_model.joblib"
    preprocessor_path: str = "./ml/models/preprocessor.joblib"
    model_metadata_path: str = "./ml/models/model_metadata.json"
    dataset_path: str = "./ml/data/heart_disease.csv"

    admin_email: str = "admin@hearthealthai.dev"
    admin_password: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"

    debug: bool = True
    log_level: str = "INFO"

    medical_disclaimer_enabled: bool = True
    emergency_warning_enabled: bool = True

    reports_dir: str = "./reports"
    upload_dir: str = "./uploads"

    password_min_length: int = 8
    max_login_attempts: int = 5

    testing: bool = False

    risk_low_max: float = 0.33
    risk_moderate_max: float = 0.66

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                import json

                return json.loads(stripped)
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
