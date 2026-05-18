import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SantaFut API"
    VERSION: str = "1.0.0"
    
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Permitir carregar do arquivo .env
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
