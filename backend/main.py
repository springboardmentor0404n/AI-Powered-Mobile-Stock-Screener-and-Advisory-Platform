from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from dotenv import load_dotenv
import os

# Explicitly load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from database import engine, Base, get_db
from auth import router as auth_router, get_current_user
from models import User, Stock, Fundamentals, Technicals, Watchlist, Portfolio, Alert
from schemas import ScreenerQuery, WatchlistAdd, StockResponse, ScreenerResponse, PortfolioAdd, PortfolioItem, AlertCreate, AlertResponse
from llm_service import parse_query, generate_pros_cons
from screener_engine import execute_screener_query
import data_ingestion
import yfinance as yf
import pandas as pd
import asyncio

app = FastAPI(title="AI Stock Screener")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:8082", "http://127.0.0.1:8081", "http://127.0.0.1:8082", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.on_event("startup")
async def startup():
    # Initialize DB tables
    async with engine.begin() as conn:
        # In prod, use alembic. Here we auto-create.
        await conn.run_sync(Base.metadata.create_all)
    
    # Start Background Data Ingestion Loop
    asyncio.create_task(periodic_ingestion())

async def periodic_ingestion():
    # Wait for DB to be ready
    await asyncio.sleep(5) 
    
    while True:
        try:
            print("⏳ Starting scheduled data refresh...")
            
            # Create a new session for this background task
            async for db in get_db():
                # 1. Update Data
                await data_ingestion.fetch_and_update_data(db)
                
                # 2. Check Alerts against new data
                await check_alerts(db) 
                
                # Break after one yield because get_db is a generator
                break 

            print("✅ Data refresh complete. Sleeping for 15 minutes.")
        except Exception as e:
            print(f"❌ Error in background ingestion: {e}")
            
        await asyncio.sleep(60) # Sleep for 1 minute (60 seconds)

@app.get("/")
def read_root():
    return {"message": "AI Stock Screener API is running"}

@app.post("/query", response_model=ScreenerResponse)
async def screen_stocks(query: ScreenerQuery, db: AsyncSession = Depends(get_db)):
    """
    Unified endpoint for NL Search.
    Handles 'Show details of Reliance' AND 'Stocks with PE < 15'.
    """
    dsl = await parse_query(query.query)
    
    if "error" in dsl:
        raise HTTPException(status_code=400, detail=dsl["error"])
    
    result = await execute_screener_query(dsl, db)
    return result

@app.get("/stock/{symbol}")
async def get_stock_detail(symbol: str, db: AsyncSession = Depends(get_db)):
    # Fetch deeply nested relations
    stmt = select(Stock).where(Stock.symbol == symbol.upper()).options(
        selectinload(Stock.fundamentals),
        selectinload(Stock.technicals)
    )
    result = await db.execute(stmt)
    stock = result.scalars().first()
    
    if not stock:
        # Fallback: Trigger ingest for this symbol?
        # For now, 404
        raise HTTPException(status_code=404, detail="Stock not found")
        
    return stock

@app.get("/stock/{symbol}/history")
async def get_stock_history(symbol: str, period: str = "1y", interval: str = "1d"):
    """
    Fetches historical data for charts.
    """
    try:
        # DB stores 'TCS', but yfinance needs 'TCS.NS'
        # Heuristic: If it looks like an Indian stock (standard list) and has no suffix, add .NS
        search_symbol = symbol.upper()
        if not search_symbol.endswith(".NS") and not search_symbol.endswith(".BO"):
            # Assume NSE for now as per data_ingestion.py logic
            search_symbol = f"{search_symbol}.NS"
            
        ticker = yf.Ticker(search_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="No history found")
            
        # Transform for Frontend (List of dictionaries)
        data = []
        for date, row in hist.iterrows():
            data.append({
                "timestamp": date.timestamp(),
                "date": date.strftime('%Y-%m-%d'),
                "open": row['Open'],
                "high": row['High'],
                "low": row['Low'],
                "close": row['Close'],
                "volume": row['Volume']
            })
            
        return data
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/watchlist")
async def get_watchlist(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Watchlist).where(Watchlist.user_id == user.id).options(
        selectinload(Watchlist.stock).selectinload(Stock.fundamentals)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    # Transform to list of stocks
    return [item.stock for item in items]

@app.post("/watchlist")
async def add_to_watchlist(item: WatchlistAdd, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check if stock exists
    stmt = select(Stock).where(Stock.symbol == item.symbol.upper())
    result = await db.execute(stmt)
    stock = result.scalars().first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found in database. Please ingest first.")
    
    # Check if already in watchlist
    stmt = select(Watchlist).where(Watchlist.user_id == user.id, Watchlist.stock_id == stock.id)
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
         return {"message": "Already in watchlist"}

    new_item = Watchlist(user_id=user.id, stock_id=stock.id)
    db.add(new_item)
    await db.commit()
    return {"message": f"Added {stock.symbol} to watchlist"}

@app.post("/admin/ingest")
async def trigger_ingestion(background_tasks: BackgroundTasks):
    background_tasks.add_task(data_ingestion.fetch_and_update_data)
    return {"message": "Ingestion triggered in background"}

async def check_alerts(db: AsyncSession):
    try:
        stmt = select(Alert).where(Alert.status == "ACTIVE").options(selectinload(Alert.stock))
        result = await db.execute(stmt)
        active_alerts = result.scalars().all()

        for alert in active_alerts:
            stock = alert.stock
            if not stock or not stock.current_price:
                continue
                
            triggered = False
            if alert.condition == "ABOVE" and stock.current_price > alert.target_price:
                triggered = True
            elif alert.condition == "BELOW" and stock.current_price < alert.target_price:
                triggered = True
                
            if triggered:
                print(f"🚨 ALERT TRIGGERED: {stock.symbol} is {alert.condition} {alert.target_price}")
                alert.status = "TRIGGERED"
                alert.triggered_at = datetime.utcnow()
                
        await db.commit()
    except Exception as e:
        print(f"Error checking alerts: {e}")

# Alert Endpoints
from datetime import datetime

@app.post("/alerts", response_model=AlertResponse)
async def create_alert(alert: AlertCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check bounds
    stmt = select(Stock).where(Stock.id == alert.stock_id)
    result = await db.execute(stmt)
    stock = result.scalars().first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    new_alert = Alert(
        user_id=user.id,
        stock_id=alert.stock_id,
        target_price=alert.target_price,
        condition=alert.condition,
        status="ACTIVE"
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return new_alert

@app.get("/alerts", response_model=List[AlertResponse])
async def get_my_alerts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.user_id == user.id).options(selectinload(Alert.stock))
    result = await db.execute(stmt)
    return result.scalars().all()

@app.get("/alerts/triggered", response_model=List[AlertResponse])
async def get_triggered_alerts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.user_id == user.id, Alert.status == "TRIGGERED").options(selectinload(Alert.stock))
    result = await db.execute(stmt)
    return result.scalars().all()

@app.post("/alerts/{alert_id}/ack")
async def acknowledge_alert(alert_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    result = await db.execute(stmt)
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "ACKNOWLEDGED" 
    await db.commit()
    return {"message": "Alert acknowledged"}

@app.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    result = await db.execute(stmt)
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.delete(alert)
    await db.commit()
    return {"message": "Alert deleted"}

# --- Portfolio Endpoints ---
from schemas import PortfolioAdd, PortfolioSell, PortfolioItem

@app.post("/portfolio/add")
async def add_portfolio(item: PortfolioAdd, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check if stock exists
    stmt = select(Stock).where(Stock.id == item.stock_id)
    result = await db.execute(stmt)
    stock = result.scalars().first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Check if holding exists
    stmt = select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.stock_id == item.stock_id)
    result = await db.execute(stmt)
    holding = result.scalars().first()

    if holding:
        # Weighted Average Price Calculation
        # Formula: ((OldQty * OldAvg) + (NewQty * BuyPrice)) / (OldQty + NewQty)
        total_cost = (holding.quantity * holding.avg_price) + (item.quantity * item.price)
        total_qty = holding.quantity + item.quantity
        holding.avg_price = total_cost / total_qty
        holding.quantity = total_qty
    else:
        new_holding = Portfolio(
            user_id=user.id,
            stock_id=item.stock_id,
            quantity=item.quantity,
            avg_price=item.price
        )
        db.add(new_holding)
    
    await db.commit()
    return {"message": "Portfolio updated"}

@app.get("/portfolio", response_model=List[PortfolioItem])
async def get_portfolio(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Portfolio).where(Portfolio.user_id == user.id).options(selectinload(Portfolio.stock))
    result = await db.execute(stmt)
    holdings = result.scalars().all()
    
    response = []
    for h in holdings:
        stock = h.stock
        # Use current market price if available, else fallback to avg (no pnl)
        current_price = stock.current_price if stock and stock.current_price else h.avg_price
        
        current_value = h.quantity * current_price
        invested_value = h.quantity * h.avg_price
        pnl = current_value - invested_value
        pnl_percent = (pnl / invested_value * 100) if invested_value > 0 else 0.0
        
        response.append({
            "id": h.id,
            "stock": stock,
            "quantity": h.quantity,
            "avg_price": h.avg_price,
            "current_value": current_value,
            "invested_value": invested_value,
            "pnl": pnl,
            "pnl_percent": pnl_percent
        })
    return response

@app.post("/portfolio/sell")
async def sell_portfolio(item: PortfolioSell, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.stock_id == item.stock_id)
    result = await db.execute(stmt)
    holding = result.scalars().first()
    
    if not holding:
         raise HTTPException(status_code=404, detail="Holding not found")
    
    if item.quantity > holding.quantity:
        raise HTTPException(status_code=400, detail="Not enough quantity to sell")
    
    holding.quantity -= item.quantity
    
    # If sold all, remove from DB
    if holding.quantity <= 0:
        await db.delete(holding)
        
    await db.commit()
    return {"message": "Sold successfully"}

# --- Professional Features Endpoints ---
from models import Fundamentals, News
from schemas import FundamentalsResponse, NewsResponse

@app.get("/stock/{symbol}/financials", response_model=Optional[FundamentalsResponse])
async def get_financials(symbol: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Stock).where(Stock.symbol == symbol)
    result = await db.execute(stmt)
    stock = result.scalars().first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    stmt = select(Fundamentals).where(Fundamentals.stock_id == stock.id)
    result = await db.execute(stmt)
    fundamentals = result.scalars().first()
    
    return fundamentals

@app.get("/stock/{symbol}/news", response_model=List[NewsResponse])
async def get_news(symbol: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Stock).where(Stock.symbol == symbol)
    result = await db.execute(stmt)
    stock = result.scalars().first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    stmt = select(News).where(News.stock_id == stock.id).order_by(News.published_at.desc())
    result = await db.execute(stmt)
    news = result.scalars().all()
    
    return news

@app.get("/stock/{symbol}/pros-cons")
async def get_stock_analysis(symbol: str, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Stock + Fundamentals + Technicals
    stmt = select(Stock).where(Stock.symbol == symbol).options(
        selectinload(Stock.fundamentals),
        selectinload(Stock.technicals)
    )
    result = await db.execute(stmt)
    stock = result.scalars().first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # 2. Fetch Recent News
    stmt = select(News).where(News.stock_id == stock.id).order_by(News.published_at.desc()).limit(5)
    result = await db.execute(stmt)
    news = result.scalars().all()

    # 3. Prepare Data for AI
    stock_data = {
        "symbol": stock.symbol,
        "company_name": stock.company_name,
        "current_price": stock.current_price,
        "pe_ratio": stock.fundamentals.pe_ratio if stock.fundamentals else None,
        "roe": stock.fundamentals.roe if stock.fundamentals else None,
        "debt_to_equity": stock.fundamentals.debt_to_equity if stock.fundamentals else None,
        "rsi": stock.technicals.rsi_14 if stock.technicals else None
    }

    # 4. Generate Analysis
    analysis = await generate_pros_cons(stock_data, news)
    return analysis

# --- Market Summary Endpoints ---
from sqlalchemy import desc

@app.get("/market/news", response_model=List[NewsResponse])
async def get_market_news(db: AsyncSession = Depends(get_db)):
    """
    Get latest news across all stocks
    """
    stmt = select(News).options(selectinload(News.stock)).order_by(desc(News.published_at)).limit(10)
    result = await db.execute(stmt)
    news = result.scalars().all()
    return news

@app.get("/market/trending")
async def get_market_trending(db: AsyncSession = Depends(get_db)):
    """
    Get top gainers and losers based on daily change
    """
    # We fetch all stocks and sort in python for simplicity as detailed calcs in SQL can be complex in generic sqlalchemy
    # In prod, use computed column or raw SQL
    stmt = select(Stock)
    result = await db.execute(stmt)
    stocks = result.scalars().all()
    
    # Calculate change %
    stock_data = []
    for s in stocks:
        if s.current_price and s.previous_close and s.previous_close > 0:
            change = ((s.current_price - s.previous_close) / s.previous_close) * 100
            stock_data.append({
                "id": s.id,
                "symbol": s.symbol,
                "company_name": s.company_name,
                "current_price": s.current_price,
                "change_percent": change
            })
            
    # Sort
    stock_data.sort(key=lambda x: x["change_percent"], reverse=True)
    
    # Top 5 Gainers
    gainers = stock_data[:5]
    
    # Top 5 Losers (reverse of bottom 5)
    losers = sorted(stock_data, key=lambda x: x["change_percent"])[:5]
    
    return {
        "gainers": gainers,
        "losers": losers
    }
