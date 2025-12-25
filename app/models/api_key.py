from sqlalchemy import Column, Integer, String, TIMESTAMP
from app.db import Base
from datetime import datetime

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True)
    owner = Column(String)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
