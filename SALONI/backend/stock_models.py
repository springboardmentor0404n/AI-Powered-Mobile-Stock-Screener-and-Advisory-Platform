from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
from sqlalchemy.dialects.postgresql import TEXT


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True)  # Stock symbol like RELIANCE
    company_name = Column(TEXT)  # Company name
    industry = Column(TEXT)  # Industry sector
    category = Column(TEXT)  # Category like Large-cap, Mid-cap, etc.
    market_cap = Column(TEXT)  # Market capitalization
    current_value = Column(Float)  # Original value from CSV
    
    # Real-time data fields
    current_price = Column(Float, nullable=True)  # Current stock price
    daily_high = Column(Float, nullable=True)  # Daily high price
    daily_low = Column(Float, nullable=True)  # Daily low price
    volume = Column(Integer, nullable=True)  # Trading volume
    last_updated = Column(DateTime, nullable=True)  # Timestamp of last update