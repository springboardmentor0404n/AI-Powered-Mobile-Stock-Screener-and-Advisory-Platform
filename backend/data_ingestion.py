import yfinance as yf
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Stock, Fundamentals, Technicals
from database import SessionLocal
import asyncio
import logging

# List of popular NSE stocks
SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
    "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS",
    "LICI.NS", "LT.NS", "AXISBANK.NS", "HCLTECH.NS", "BAJFINANCE.NS"
]

async def fetch_and_update_data():
    print("Starting data ingestion...")
    async with SessionLocal() as db:
        for symbol in SYMBOLS:
            try:
                # Run sync yfinance call in executor
                loop = asyncio.get_event_loop()
                ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
                info = await loop.run_in_executor(None, lambda: ticker.info)
                
                clean_symbol = symbol.split('.')[0]
                
                # Upsert Stock
                stmt = select(Stock).where(Stock.symbol == clean_symbol)
                result = await db.execute(stmt)
                stock = result.scalars().first()
                
                if not stock:
                    stock = Stock(
                        symbol=clean_symbol, 
                        company_name=info.get('longName', clean_symbol), 
                        sector=info.get('sector', 'Unknown')
                    )
                    db.add(stock)
                    await db.commit()
                    await db.refresh(stock)
                
                # Update Stock Price
                current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
                stock.current_price = current_price
                stock.market_cap = info.get('marketCap')
                
                # Upsert Fundamentals
                fund_stmt = select(Fundamentals).where(Fundamentals.stock_id == stock.id)
                result = await db.execute(fund_stmt)
                fund = result.scalars().first()
                
                if not fund:
                    fund = Fundamentals(stock_id=stock.id)
                    db.add(fund)
                
                fund.pe_ratio = info.get('trailingPE')
                fund.roe = info.get('returnOnEquity')
                fund.debt_to_equity = info.get('debtToEquity')
                if fund.debt_to_equity: fund.debt_to_equity /= 100 # yf returns percentage usually
                fund.eps = info.get('trailingEps')
                fund.div_yield = info.get('dividendYield')
                fund.book_value = info.get('bookValue')
                
                # Techs (Mocking some for now as yf info doesn't always have calculated indicators)
                tech_stmt = select(Technicals).where(Technicals.stock_id == stock.id)
                result = await db.execute(tech_stmt)
                tech = result.scalars().first()
                
                if not tech:
                    tech = Technicals(stock_id=stock.id)
                    db.add(tech)
                
                # Placeholder logic for techs
                tech.rsi_14 = 50.0 
                tech.macd = 0.0
                
                await db.commit()
                print(f"Updated {clean_symbol}")
                
            except Exception as e:
                print(f"Error updating {symbol}: {e}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(fetch_and_update_data())
