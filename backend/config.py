"""Configuration management for RAG application"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    GOOGLE_API_KEY: str
    DATABASE_URL: str = "postgresql://rag_user:rag_password@localhost:5432/rag_db"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Constants
DEFAULT_MODEL = "gemini-1.5-flash"
MAX_OUTPUT_TOKENS = 8192
EMBEDDING_DIM = 768
EMBEDDING_MODEL = "models/text-embedding-004"
CONTENT_PREVIEW_LENGTH = 200
