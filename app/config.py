# Database
DATABASE_URL = "postgresql://postgres:12345@localhost:5432/ai_screener_db"

# JWT
JWT_SECRET_KEY = "super-secret-key"  # move to .env in production

# Microservices (API Gateway)
SERVICES = {
    "users": "http://localhost:7001",
    "products": "http://localhost:7002"
}

# SMTP (Email)
SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "smtp-user"
SMTP_PASS = "smtp-pass"
FROM_EMAIL = "no-reply@example.com"

# OTP
OTP_LENGTH = 6
OTP_EXPIRE_MINUTES = 10
MAX_OTP_RESEND_PER_HOUR = 3
