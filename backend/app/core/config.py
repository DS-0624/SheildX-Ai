from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "SheildX AI - SafeCircle Watch API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = "sheildx-ai-prod"
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    
    # Maps API
    GOOGLE_MAPS_API_KEY: str = "AIzaSy_MOCK_SHEILDX_KEY_FOR_DEV"
    
    # SMTP Email Configuration (4 Emergency Emails)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = "alerts@sheildx.ai"
    SMTP_PASSWORD: Optional[str] = "app-password-placeholder"
    SMTP_FROM_EMAIL: str = "alerts@sheildx.ai"
    SMTP_FROM_NAME: str = "SheildX SafeCircle Emergency Alerts"
    
    # WhatsApp Business / Cloud API Configuration
    WHATSAPP_API_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = None
    
    # Firebase Cloud Messaging (FCM)
    FCM_PROJECT_ID: Optional[str] = None
    
    # Safety Check Parameters
    SAFETY_CHECK_INTERVAL_SECONDS: int = 30
    SAFETY_CHECK_MAX_COUNT: int = 3
    ROUTE_DEVIATION_TOLERANCE_METERS: float = 150.0  # meters
    GPS_ACCURACY_THRESHOLD_METERS: float = 50.0      # meters
    MIN_CONSECUTIVE_DEVIATIONS: int = 2
    
    # Security
    JWT_SECRET_KEY: str = "sheildx-ai-super-secret-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
