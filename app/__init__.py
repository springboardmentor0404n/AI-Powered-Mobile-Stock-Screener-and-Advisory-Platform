from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

from app.config import (
    JWT_SECRET_KEY,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL,
    OTP_LENGTH, OTP_EXPIRE_MINUTES
)
from app.extensions import jwt

def create_app():
    app = Flask(__name__)

    # -------------------------------------------------
    # 🌐 CORS Configuration
    # -------------------------------------------------
    # Ensure this matches your React URL (localhost:5173)
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True
    )

    # -------------------------------------------------
    # 🔐 Configuration
    # -------------------------------------------------
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.config["SMTP_HOST"] = SMTP_HOST
    app.config["SMTP_PORT"] = SMTP_PORT
    app.config["SMTP_USER"] = SMTP_USER
    app.config["SMTP_PASS"] = SMTP_PASS
    app.config["FROM_EMAIL"] = FROM_EMAIL
    app.config["OTP_LENGTH"] = OTP_LENGTH
    app.config["OTP_EXPIRE_MINUTES"] = OTP_EXPIRE_MINUTES

    # -------------------------------------------------
    # 🔑 Initialize Extensions
    # -------------------------------------------------
    jwt.init_app(app)

    # -------------------------------------------------
    # 📌 Register Blueprints (Keeping all existing routes)
    # -------------------------------------------------
    from app.routes.auth_routes import auth_bp
    from app.routes.gateway_routes import gateway_bp
    from app.routes.upload import upload_bp
    from app.routes.chat import chat_bp
    from app.routes.analytics import analytics_bp
    from app.routes.alerts import alerts_bp 

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(gateway_bp, url_prefix="/gateway")
    app.register_blueprint(upload_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(analytics_bp) 
    app.register_blueprint(alerts_bp, url_prefix="/alerts") # ✅ Prefix ensures URL is /alerts/create

    # -------------------------------------------------
    # 🛠️ Standard Endpoints
    # -------------------------------------------------
    @app.route('/')
    def home():
        return {
            "message": "Stock Screener API is running",
            "user_context": "Naga (ID 5)", # Verified from your DB logs
            "endpoints": {
                "auth": "/auth/*",
                "gateway": "/gateway/*",
                "analytics": "/analytics/*",
                "alerts": "/alerts/*"
            }
        }
    
    @app.route('/health')
    def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat()
        }

    return app