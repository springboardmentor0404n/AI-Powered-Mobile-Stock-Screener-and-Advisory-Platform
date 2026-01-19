"""
Configuration management for the application.
Centralizes all configuration settings and environment variables.
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

class Config:
    """Application configuration class."""
    
    # Application
    APP_NAME = "Stock Market Analytics Platform"
    VERSION = "1.0.0"
    ENV = os.getenv("ENV", "development")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be set in environment variables")
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY must be set in environment variables")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # Email
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    TESTING = os.getenv("TESTING", "False").lower() == "true"
    
    # AI/ML
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    MODEL_NAME = "all-MiniLM-L6-v2"
    EMBEDDING_BATCH_SIZE = 32
    
    # File paths
    BASE_DIR = Path(__file__).resolve().parent
    STOCK_DATA_DIR = BASE_DIR / "STOCK_DATA_CLEANING"
    TEMPLATES_DIR = BASE_DIR / "templates"
    STATIC_DIR = BASE_DIR / "static"
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # CORS (if needed)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
    
    @classmethod
    def validate(cls):
        """Validate that all required configuration is present."""
        required = [
            ("DATABASE_URL", cls.DATABASE_URL),
            ("SECRET_KEY", cls.SECRET_KEY),
        ]
        
        missing = [name for name, value in required if not value]
        
        if missing:
            raise ValueError(f"Missing required configuration: {', '.join(missing)}")
        
        return True

# Validate configuration on import
Config.validate()
