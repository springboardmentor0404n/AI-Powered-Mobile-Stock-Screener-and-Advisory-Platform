from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from database import engine, Base, get_db
from auth import router as auth_router, get_current_user
from models import User, Stock, Fundamentals, Technicals, Watchlist
from schemas import ScreenerQuery, WatchlistAdd, StockResponse, ScreenerResponse
from llm_service import parse_query
from screener_engine import execute_screener_query
import data_ingestion

app = FastAPI(title="AI Stock Screener")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
