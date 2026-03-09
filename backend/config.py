import json
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    CONTRIBOT_GITHUB_TOKEN: str = ""
    FIREBASE_SERVICE_ACCOUNT: str = "{}"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,https://contribot.vercel.app"
    
    @property
    def firebase_credentials_dict(self) -> dict:
        try:
            return json.loads(self.FIREBASE_SERVICE_ACCOUNT)
        except json.JSONDecodeError:
            return {}

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
