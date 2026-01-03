"""
Configuration module for DevSecOps with Biometry backend.
All configuration values should be defined here and imported by other modules.
"""

import os

# ==================== Security Configuration ====================

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-use-env-variable")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Biometric Encryption Configuration
BIOMETRIC_ENCRYPTION_KEY = os.getenv(
    "BIOMETRIC_ENCRYPTION_KEY",
    "your-biometric-encryption-key-change-in-production"
)
BIOMETRIC_ENCRYPTION_SALT = os.getenv(
    "BIOMETRIC_ENCRYPTION_SALT",
    "biometric-salt-change-in-production"
)

# ==================== Database Configuration ====================

# PostgreSQL database configuration
DATABASE_USER = os.getenv("DATABASE_USER", "devsecops_user")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "devsecops_password")
DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
DATABASE_NAME = os.getenv("DATABASE_NAME", "secure_console")

# SQLAlchemy Database URL
SQLALCHEMY_DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# ==================== Application Configuration ====================

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Application Settings
APP_TITLE = os.getenv("APP_TITLE", "Secure DevSecOps Console API")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"
