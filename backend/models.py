from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
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
    
    stock = relationship("Stock", back_populates="fundamentals")

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
