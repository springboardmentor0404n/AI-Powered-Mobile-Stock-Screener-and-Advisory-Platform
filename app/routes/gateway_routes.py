from flask import Blueprint, request, jsonify
from app.db import SessionLocal
from app.models.api_key import APIKey
from app.services.forwarder import forward
from app.config import SERVICES

gateway_bp = Blueprint("gateway", __name__)

def validate_api_key():
    key = request.headers.get("X-API-KEY")
    if not key:
        return False

    db = SessionLocal()
    valid = db.query(APIKey).filter_by(key=key).first()
    db.close()
    return valid is not None


@gateway_bp.before_request
def before():
    if request.path.startswith("/gateway"):
        if not validate_api_key():
            return jsonify({"error": "Invalid API Key"}), 401


@gateway_bp.route("/users/<path:path>")
def users_proxy(path):
    return forward(SERVICES["users"], path)
