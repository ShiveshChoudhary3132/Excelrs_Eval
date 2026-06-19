from pydantic_settings import BaseSettings

from typing import Optional

class Settings(BaseSettings):
    # These variables will automatically be populated from your .env file
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    GROQ_API_KEY: Optional[str] = None
    class Config:
        env_file = ".env"

# We create a single instance of this class to use throughout the app
settings = Settings()