from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    watchlist = relationship("Watchlist", back_populates="user")

class Stock(Base):
    __tablename__ = "stocks"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    company_name = Column(String)
    sector = Column(String)
    current_price = Column(Float)
    previous_close = Column(Float) # New Field for Daily P&L
    market_cap = Column(Float)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    
    fundamentals = relationship("Fundamentals", back_populates="stock", uselist=False, cascade="all, delete-orphan")
    technicals = relationship("Technicals", back_populates="stock", uselist=False, cascade="all, delete-orphan")
    watchlist_items = relationship("Watchlist", back_populates="stock")

class Fundamentals(Base):
    __tablename__ = "fundamentals"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    
    pe_ratio = Column(Float)
    roe = Column(Float)
    debt_to_equity = Column(Float)
    eps = Column(Float)
    div_yield = Column(Float)
    book_value = Column(Float)
    profit_growth = Column(Float)
    sales_growth = Column(Float)
    
    # New Fields for Professional Grade
    revenue_history = Column(String, nullable=True) # JSON String: [{"year": 2023, "value": 100}, ...]
    profit_history = Column(String, nullable=True)  # JSON String
    shareholding = Column(String, nullable=True)    # JSON String: {"promoter": 50, "fii": 20, ...}
    
    stock = relationship("Stock", back_populates="fundamentals")

class News(Base):
    __tablename__ = "news"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    headline = Column(String)
    summary = Column(String, nullable=True)
    sentiment = Column(String) # "POSITIVE", "NEGATIVE", "NEUTRAL"
    url = Column(String, nullable=True)
    published_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    stock = relationship("Stock", back_populates="news")

# Update Stock relationship
Stock.news = relationship("News", back_populates="stock", cascade="all, delete-orphan")

class Technicals(Base):
    __tablename__ = "technicals"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    
    rsi_14 = Column(Float)
    macd = Column(Float)
    sma_50 = Column(Float)
    sma_200 = Column(Float)
    volume = Column(Float)
    
    stock = relationship("Stock", back_populates="technicals")

class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    added_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="watchlist")
    stock = relationship("Stock", back_populates="watchlist_items")

class Portfolio(Base):
    __tablename__ = "portfolio"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    quantity = Column(Integer, default=1)
    avg_price = Column(Float) # Average buy price
    
    user = relationship("User", back_populates="portfolio")
    stock = relationship("Stock")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    target_price = Column(Float)
    condition = Column(String) # "ABOVE" or "BELOW"
    status = Column(String, default="ACTIVE") # "ACTIVE", "TRIGGERED"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="alerts")
    stock = relationship("Stock")

User.portfolio = relationship("Portfolio", back_populates="user")
User.alerts = relationship("Alert", back_populates="user")
