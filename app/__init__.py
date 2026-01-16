from flask import Flask
from flask_cors import CORS
import os

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
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True
    )

    # -------------------------------------------------
    # 🔐 JWT Configuration
    # -------------------------------------------------
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY

    # -------------------------------------------------
    # 📧 Email + OTP Configuration
    # -------------------------------------------------
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
    # 📌 Register Blueprints
    # -------------------------------------------------
    from app.routes.auth_routes import auth_bp
    from app.routes.gateway_routes import gateway_bp
    from app.routes.upload import upload_bp
    from app.routes.chat import chat_bp
    from app.routes.analytics import analytics_bp   # ✅ Analytics routes
    from app.routes.alerts import alerts_bp         # ✅ NEW: Import alerts blueprint

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(gateway_bp, url_prefix="/gateway")
    app.register_blueprint(upload_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(analytics_bp)            # ✅ Analytics routes at root
    app.register_blueprint(alerts_bp, url_prefix="/alerts")  # ✅ NEW: Alerts routes

    # -------------------------------------------------
    # 🛠️ Debug Routes (Remove in production)
    # -------------------------------------------------
    @app.route('/')
    def home():
        return {
            "message": "Stock Screener API is running",
            "version": "1.0.0",
            "endpoints": {
                "auth": "/auth/*",
                "gateway": "/gateway/*",
                "upload": "/upload/*",
                "chat": "/chat/*",
                "analytics": "/analytics/*",
                "alerts": "/alerts/*",
                "debug": "/debug/routes"
            }
        }
    
    @app.route('/debug/routes')
    def debug_routes():
        """Debug endpoint to list all registered routes"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'route': str(rule)
            })
        return {
            "total_routes": len(routes),
            "routes": sorted(routes, key=lambda x: x['route'])
        }
    
    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": os.datetime.now().isoformat()
        }

    return app