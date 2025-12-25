from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from app.db import Base
from datetime import datetime

class EmailUser(Base):
    __tablename__ = "email_users"

    id = Column(Integer, primary_key=True)
    username = Column(String)
    email = Column(String, unique=True)
    password_hash = Column(String)

    # ⭐ ADD THIS FIELD — YOU NEED IT
    is_email_verified = Column(Boolean, default=False)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
