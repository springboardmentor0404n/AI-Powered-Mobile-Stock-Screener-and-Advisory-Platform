from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database import Base
from datetime import datetime


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)  # Reference to the user who created the alert
    stock_symbol = Column(String(20), index=True)  # Stock symbol to monitor
    alert_type = Column(String(20))  # 'above', 'below', 'percent_change'
    target_value = Column(Float)  # Target price or percentage for the alert
    is_active = Column(Boolean, default=True)  # Whether the alert is active
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered = Column(DateTime, nullable=True)  # When the alert was last triggered
    triggered_count = Column(Integer, default=0)  # How many times the alert was triggered