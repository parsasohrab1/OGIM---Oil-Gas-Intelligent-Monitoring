"""
Shared configuration management
"""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_DIR = ROOT_DIR / "config"
DEFAULT_ENV_FILE = ROOT_DIR / ".env"

_env_file_override = os.getenv("OGIM_ENV_FILE")
env_name = os.getenv("ENVIRONMENT", "development").lower()
search_candidates = []
if _env_file_override:
    candidate_env_file = Path(_env_file_override)
    if not candidate_env_file.is_absolute():
        candidate_env_file = ROOT_DIR / candidate_env_file
    search_candidates.append(candidate_env_file)
else:
    search_candidates.extend([
        CONFIG_DIR / f".env.{env_name}",
        CONFIG_DIR / f"{env_name}.env",
    ])

candidate_env_file = None
for candidate in search_candidates:
    if candidate.exists():
        candidate_env_file = candidate
        break
    example_candidate = candidate.with_name(candidate.name + ".example")
    if example_candidate.exists():
        candidate_env_file = example_candidate
        break

if candidate_env_file is None:
    candidate_env_file = DEFAULT_ENV_FILE


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "OGIM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://ogim_user:ogim_password@postgres:5432/ogim",
        env="DATABASE_URL"
    )
    TIMESCALE_URL: str = Field(
        default="postgresql://ogim_user:ogim_password@timescaledb:5432/ogim_tsdb",
        env="TIMESCALE_URL"
    )
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = Field(
        default="kafka:9092",
        env="KAFKA_BOOTSTRAP_SERVERS"
    )
    KAFKA_SCHEMA_REGISTRY_URL: str = Field(
        default="http://schema-registry:8081",
        env="KAFKA_SCHEMA_REGISTRY_URL"
    )
    
    # Redis (for caching and session)
    REDIS_URL: str = Field(
        default="redis://redis:6379/0",
        env="REDIS_URL"
    )
    
    # Security
    SECRET_KEY: str = Field(
        default="change-this-secret-key-in-production-minimum-32-characters",
        env="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: list = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="CORS_ORIGINS"
    )
    
    # Services URLs (for API Gateway)
    AUTH_SERVICE_URL: str = Field(default="http://auth-service:8001", env="AUTH_SERVICE_URL")
    DATA_INGESTION_SERVICE_URL: str = Field(default="http://data-ingestion-service:8002", env="DATA_INGESTION_SERVICE_URL")
    ML_INFERENCE_SERVICE_URL: str = Field(default="http://ml-inference-service:8003", env="ML_INFERENCE_SERVICE_URL")
    ALERT_SERVICE_URL: str = Field(default="http://alert-service:8004", env="ALERT_SERVICE_URL")
    REPORTING_SERVICE_URL: str = Field(default="http://reporting-service:8005", env="REPORTING_SERVICE_URL")
    COMMAND_CONTROL_SERVICE_URL: str = Field(default="http://command-control-service:8006", env="COMMAND_CONTROL_SERVICE_URL")
    TAG_CATALOG_SERVICE_URL: str = Field(default="http://tag-catalog-service:8007", env="TAG_CATALOG_SERVICE_URL")
    DIGITAL_TWIN_SERVICE_URL: str = Field(default="http://digital-twin-service:8008", env="DIGITAL_TWIN_SERVICE_URL")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = "json"  # json or text
    
    # OPC-UA / SCADA
    OPCUA_SERVER_URL: Optional[str] = Field(default=None, env="OPCUA_SERVER_URL")
    OPCUA_USERNAME: Optional[str] = Field(default=None, env="OPCUA_USERNAME")
    OPCUA_PASSWORD: Optional[str] = Field(default=None, env="OPCUA_PASSWORD")
    
    # ML Models
    MODEL_STORAGE_PATH: str = Field(default="/app/models", env="MODEL_STORAGE_PATH")
    MLFLOW_TRACKING_URI: Optional[str] = Field(default=None, env="MLFLOW_TRACKING_URI")
    
    class Config:
        env_file = candidate_env_file
        case_sensitive = True


# Global settings instance
settings = Settings()

