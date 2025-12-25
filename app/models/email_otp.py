# app/models/email_otp.py
from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class EmailOTP(Base):
    __tablename__ = "email_otps"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("email_users.id", ondelete="CASCADE"), nullable=False)
    otp = Column(String(16), nullable=False)          # store plain or hashed OTP (we store plain for simplicity)
    purpose = Column(String(32), nullable=False)      # e.g. 'verify_email' or 'login_2fa'
    attempts = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
