from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from app.db import SessionLocal
from app.models.email_user import EmailUser
from app.models.email_otp import EmailOTP
from app.utils.hash_utils import hash_password, verify_password
from app.utils.otp import generate_numeric_otp
from app.services.emailer import send_otp_email
from datetime import datetime, timedelta
from sqlalchemy import desc

auth_bp = Blueprint("auth", __name__)

# Helper: create and send OTP
def _create_and_send_otp(db, user_id, email, purpose="verify_email"):
    otp = generate_numeric_otp(current_app.config.get("OTP_LENGTH", 6))
    expires_at = datetime.utcnow() + timedelta(
        minutes=int(current_app.config.get("OTP_EXPIRE_MINUTES", 10))
    )
    otp_row = EmailOTP(
        user_id=user_id,
        otp=otp,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(otp_row)
    db.commit()

    try:
        send_otp_email(email, otp, minutes=int(current_app.config.get("OTP_EXPIRE_MINUTES", 10)))
    except Exception as e:
        current_app.logger.error("Failed to send OTP email: %s", str(e))


@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.json or {}
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "username, email, password are required"}), 400

    db = SessionLocal()
    try:
        if db.query(EmailUser).filter_by(email=email).first():
            return jsonify({"error": "Email already exists"}), 400

        user = EmailUser(
            username=username,
            email=email,
            password_hash=hash_password(password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        _create_and_send_otp(db, user.id, user.email, purpose="verify_email")
        return jsonify({"message": "User created. Verification OTP sent to email."}), 201
    finally:
        db.close()


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    payload = request.json or {}
    email = payload.get("email", "").strip().lower()
    otp = payload.get("otp", "").strip()

    if not email or not otp:
        return jsonify({"error": "email and otp required"}), 400

    db = SessionLocal()
    try:
        user = db.query(EmailUser).filter_by(email=email).first()
        if not user:
            return jsonify({"error": "user_not_found"}), 404
        if user.is_email_verified:
            return jsonify({"message": "already_verified"}), 200

        otp_row = (
            db.query(EmailOTP)
            .filter_by(user_id=user.id, purpose="verify_email", is_used=False)
            .order_by(desc(EmailOTP.created_at))
            .first()
        )

        if not otp_row:
            return jsonify({"error": "no_otp_found"}), 400
        if otp_row.expires_at < datetime.utcnow():
            return jsonify({"error": "otp_expired"}), 400
        if otp_row.otp != otp:
            otp_row.attempts += 1
            db.commit()
            return jsonify({"error": "invalid_otp"}), 400

        otp_row.is_used = True
        user.is_email_verified = True
        db.commit()

        token = create_access_token(
            identity=user.id,
            additional_claims={"username": user.username, "email": user.email}
        )
        return jsonify({"access_token": token}), 200
    finally:
        db.close()


@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    payload = request.json or {}
    email = payload.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "email required"}), 400

    db = SessionLocal()
    try:
        user = db.query(EmailUser).filter_by(email=email).first()
        if not user:
            return jsonify({"error": "user_not_found"}), 404

        active_otps = (
            db.query(EmailOTP)
            .filter_by(user_id=user.id, purpose="verify_email", is_used=False)
            .count()
        )
        if active_otps >= 3:
            return jsonify({"error": "too_many_requests"}), 429

        _create_and_send_otp(db, user.id, user.email, purpose="verify_email")
        return jsonify({"message": "OTP resent"}), 200
    finally:
        db.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.json or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    db = SessionLocal()
    try:
        user = db.query(EmailUser).filter_by(email=email).first()
        if not user or not verify_password(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401

        if not user.is_email_verified:
            _create_and_send_otp(db, user.id, user.email, purpose="verify_email")
            return jsonify({
                "error": "email_not_verified",
                "message": "OTP sent to email"
            }), 403

        token = create_access_token(
            identity=user.id,
            additional_claims={"username": user.username, "email": user.email}
        )
        return jsonify({"access_token": token}), 200
    finally:
        db.close()
