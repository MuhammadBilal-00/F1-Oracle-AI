"""F1 Oracle AI — Central Configuration"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Project
    PROJECT_NAME: str = "F1 Oracle AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = DATA_DIR / "raw"
    PROCESSED_DATA_DIR: Path = DATA_DIR / "processed"
    FEATURES_DIR: Path = DATA_DIR / "features"
    MODELS_DIR: Path = DATA_DIR / "models"
    ARTIFACTS_DIR: Path = BASE_DIR / "ml" / "artifacts"

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/f1_oracle.db"
    DATABASE_ECHO: bool = False

    # API
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "f1-oracle-ai-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Redis (optional caching)
    REDIS_URL: str = "redis://localhost:6379"

    # MLflow
    MLFLOW_TRACKING_URI: str = "file:///" + str(BASE_DIR / "ml" / "experiments").replace("\\", "/")
    MLFLOW_EXPERIMENT_NAME: str = "f1_oracle_experiments"

    # ML
    RANDOM_STATE: int = 42
    TEST_SIZE: float = 0.2
    CV_FOLDS: int = 5

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001", "https://f1-oracle.vercel.app"]


settings = Settings()
