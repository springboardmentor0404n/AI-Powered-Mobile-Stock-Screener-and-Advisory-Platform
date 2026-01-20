from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from dotenv import load_dotenv
import os


load_dotenv()



DATABASE_URL = "sqlite:///./stockai.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =========================
# ALERTS TABLE (NEW)
# =========================
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=True)
    alert_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ✅ Create tables
Base.metadata.create_all(bind=engine)

# ✅ THIS FUNCTION MUST EXIST
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
print("DATABASE_URL =", DATABASE_URL)
