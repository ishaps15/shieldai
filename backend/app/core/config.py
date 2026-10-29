import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "ShieldAI"
    API_V1_STR: str = "/api/v1"
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR.parent / "data"
    MODEL_DIR: Path = BASE_DIR / "saved_models"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/shieldai.db"
    
    # Default Thresholds
    DEFAULT_THRESHOLD_LOW: float = 0.35
    DEFAULT_THRESHOLD_MEDIUM: float = 0.55
    DEFAULT_THRESHOLD_HIGH: float = 0.75
    DEFAULT_THRESHOLD_CRITICAL: float = 0.90
    DEFAULT_MAX_ALERTS_PER_DAY: int = 250
    DEFAULT_AMOUNT_RULE_THRESHOLD: float = 10000.0
    DEFAULT_RAPID_TX_SECONDS: int = 120
    DEFAULT_CUSTOMER_SIGMA: float = 3.5

    # Isolation Forest Defaults
    DEFAULT_CONTAMINATION: float = 0.05
    DEFAULT_N_ESTIMATORS: int = 150
    DEFAULT_RANDOM_SEED: int = 42
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
