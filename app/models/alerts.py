from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    symbol = Column(String)
    condition = Column(String)
    threshold = Column(Float)
