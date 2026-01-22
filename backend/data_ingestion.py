import yfinance as yf
from dotenv import load_dotenv
import os

# Load env vars if running standalone
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Stock, Fundamentals, Technicals
from database import SessionLocal
import asyncio
import logging
import pandas as pd
import numpy as np

# List of popular NSE stocks
# Expanded List of ~150 Popular NSE Stocks (Large, Mid, Small Caps)
SYMBOLS = [
    # --- NIFTY 50 (Large Caps) ---
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "LICI.NS",
    "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "HCLTECH.NS", "TITAN.NS", "BAJFINANCE.NS", "SUNPHARMA.NS", "ASIANPAINT.NS", "MARUTI.NS", "ULTRACEMCO.NS",
    "TATASTEEL.NS", "NTPC.NS", "POWERGRID.NS", "M&M.NS", "ADANIENT.NS", "BAJAJFINSV.NS", "HDFCLIFE.NS", "WIPRO.NS", "COALINDIA.NS", "ONGC.NS",
    "TATAMOTORS.NS", "SBILIFE.NS", "DRREDDY.NS", "GRASIM.NS", "ADANIPORTS.NS", "HINDALCO.NS", "CIPLA.NS", "EICHERMOT.NS", "NESTLEIND.NS", "BPCL.NS",
    "TECHM.NS", "BRITANNIA.NS", "HEROMOTOCO.NS", "APOLLOHOSP.NS", "TATACONSUM.NS", "DIVISLAB.NS", "INDUSINDBK.NS", "JSWSTEEL.NS", "UPL.NS", "BAJAJ-AUTO.NS",

    # --- NIFTY NEXT 50 & Midcaps (Growth & Popular) ---
    "PFC.NS", "REC.NS", "IRFC.NS", "SHRIRAMFIN.NS", "CHOLAFIN.NS", "BANKBARODA.NS", "PNB.NS", "IDFCFIRSTB.NS", "AUBANK.NS", "FEDERALBNK.NS",
    "ABCAPITAL.NS", "M&MFIN.NS", "CANBK.NS", "MUTHOOTFIN.NS", "IOB.NS", "UNIONBANK.NS", "YESBANK.NS", "JIOFIN.NS",
    "LTIM.NS", "LTTS.NS", "KPITTECH.NS", "PERSISTENT.NS", "COFORGE.NS", "MPHASIS.NS", "TATAELXSI.NS", "ZOMATO.NS", "PAYTM.NS", "POLICYBZR.NS",
    "NAUKRI.NS", "NYKAA.NS", "DELHIVERY.NS", "IDEA.NS", "INDUSTOWER.NS", "SONATSOFTW.NS",
    "TVSMOTOR.NS", "ASHOKLEY.NS", "BHARATFORG.NS", "MRF.NS", "BALKRISIND.NS", "MOTHERSON.NS", "BOSCHLTD.NS", "UNOMINDA.NS", "EXIDEIND.NS",
    "LUPIN.NS", "AUROPHARMA.NS", "ZYDUSLIFE.NS", "ALKEM.NS", "TORNTPHARM.NS", "BIOCON.NS", "MAXHEALTH.NS", "SYNGENE.NS", "LALPATHLAB.NS", "MANKIND.NS",
    "VBL.NS", "TRENT.NS", "GODREJCP.NS", "DABUR.NS", "MARICO.NS", "COLPAL.NS", "BERGEPAINT.NS", "PIDILITIND.NS", "UNITEDSPIR.NS", "MCDOWELL-N.NS",
    "PAGEIND.NS", "HAVELLS.NS", "VOLTAS.NS", "WHIRLPOOL.NS", "DIXON.NS", "AMBER.NS",
    "IOC.NS", "GAIL.NS", "HPCL.NS", "OIL.NS", "IGL.NS", "MGL.NS", "TATAPOWER.NS", "ADANIGREEN.NS", "ADANIPOWER.NS", "JSWENERGY.NS", "NHPC.NS", "SJVN.NS",
    "SUZLON.NS", "BHEL.NS",
    "HAL.NS", "BEL.NS", "MAZDOCK.NS", "COCHINSHIP.NS", "BDL.NS", "RVNL.NS", "IRCON.NS", "RITES.NS", "RAILTEL.NS", 
    "VEDL.NS", "HINDZINC.NS", "NMDC.NS", "JINDALSTEL.NS", "SAIL.NS", "ACC.NS", "AMBUJACEM.NS", "SHREECEM.NS", "DALBHARAT.NS",
    "DLF.NS", "GODREJPROP.NS", "LODHA.NS", "OBEROIRLTY.NS", "PHOENIXLTD.NS", "PRESTIGE.NS", "GMRINFRA.NS", "IRB.NS",
    "PIIND.NS", "SRF.NS", "AARTIIND.NS", "COROMANDEL.NS", "CHAMBLFERT.NS", "DEEPAKNTR.NS", "TATACHEM.NS"
]

def calculate_rsi(data, window=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)
    
    avg_gain = gain.rolling(window=window, min_periods=window).mean()
    avg_loss = loss.rolling(window=window, min_periods=window).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_technicals(history_df):
    """
    Calculates RSI, MACD, SMA 50, SMA 200, and Pivot Points
    Returns a dictionary of the latest values.
    """
    try:
        if history_df.empty or len(history_df) < 50:
            return {}

        df = history_df.copy()
        
        # SMA
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['SMA_200'] = df['Close'].rolling(window=200).mean()
        
        # RSI
        df['RSI'] = calculate_rsi(df['Close'])
        
        # MACD
        exp12 = df['Close'].ewm(span=12, adjust=False).mean()
        exp26 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp12 - exp26
        df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
        
        # Latest Values
        latest = df.iloc[-1]
        
        # Pivot Points (Standard) based on previous Candle (approx latest for now or prev day)
        # Using the last completed day (iloc[-1] might be current live day logic, let's use it as 'latest closed' proxy)
        high = latest['High']
        low = latest['Low']
        close = latest['Close']
        pp = (high + low + close) / 3
        r1 = (2 * pp) - low
        s1 = (2 * pp) - high
        
        return {
            "rsi_14": float(latest['RSI']) if not pd.isna(latest['RSI']) else 50.0,
            "macd": float(latest['MACD']) if not pd.isna(latest['MACD']) else 0.0,
            "sma_50": float(latest['SMA_50']) if not pd.isna(latest['SMA_50']) else 0.0,
            "sma_200": float(latest['SMA_200']) if not pd.isna(latest['SMA_200']) else 0.0,
            "pivot_point": float(pp),
            "r1": float(r1),
            "s1": float(s1)
        }
    except Exception as e:
        print(f"Error calcing technicals: {e}")
        return {}

async def fetch_and_update_data(db: AsyncSession = None):
    print("Starting data ingestion...")
    if db:
        await process_symbols(db)
    else:
        async with SessionLocal() as session:
            await process_symbols(session)

# Concurrency Limit
SEMAPHORE = asyncio.Semaphore(10) # 10 Concurrent requests

async def fetch_symbol_data(symbol):
    """
    Fetches all data for a symbol concurrently from YFinance
    """
    async with SEMAPHORE:
        try:
            loop = asyncio.get_event_loop()
            
            # Run blocking yf calls in executor
            ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
            
            # Fetch Info and History in parallel if possible? 
            # Ticker object is not thread safe? Actually yfinance Ticker is mostly stateless lazy loader.
            # But let's keep it simple: just run the IO bound property access in executor
            
            def get_info():
                return ticker.info
            
            def get_history():
                return ticker.history(period="1y")
                
            def get_news():
                return ticker.news
            
            # Run these in parallel
            # We wrap them in executor
            
            info_task = loop.run_in_executor(None, get_info)
            hist_task = loop.run_in_executor(None, get_history)
            news_task = loop.run_in_executor(None, get_news)
            
            info, history, news_items = await asyncio.gather(info_task, hist_task, news_task)
            
            tech_data = {}
            if not history.empty:
                tech_data = calculate_technicals(history)
                
            return {
                "symbol": symbol,
                "info": info,
                "history": history,
                "news": news_items,
                "tech_data": tech_data,
                "success": True
            }
            
        except Exception as e:
            print(f"❌ Error fetching {symbol}: {e}")
            return {"symbol": symbol, "success": False, "error": str(e)}

async def process_symbols(db: AsyncSession):
    print(f"🚀 Starting parallel ingestion for {len(SYMBOLS)} stocks...")
    start_time = asyncio.get_event_loop().time()
    
    # 1. Fetch ALL data in parallel
    tasks = [fetch_symbol_data(symbol) for symbol in SYMBOLS]
    results = await asyncio.gather(*tasks)
    
    print("✅ Fetch complete. Writing to database...")
    
    # 2. Write to DB Sequentially (Safe for single session)
    count = 0
    for data in results:
        if not data["success"]:
            continue
            
        try:
            symbol = data["symbol"]
            info = data["info"]
            history = data["history"]
            tech_data = data["tech_data"]
            yf_news = data["news"]
            
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
            current_price = info.get('currentPrice') or info.get('regularMarketPrice')
            previous_close = info.get('previousClose')
            
            if not current_price and not history.empty:
                current_price = history['Close'].iloc[-1]
            if not previous_close and len(history) >= 2:
                previous_close = history['Close'].iloc[-2]
                
            stock.current_price = current_price
            stock.previous_close = previous_close
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
            if fund.debt_to_equity: fund.debt_to_equity /= 100 
            fund.eps = info.get('trailingEps')
            fund.div_yield = info.get('dividendYield')
            fund.book_value = info.get('bookValue')
            fund.profit_growth = info.get('earningsGrowth')
            fund.sales_growth = info.get('revenueGrowth')
            
            # Mock History (Preserve existing logic)
            import json
            import random
            if not fund.revenue_history: # Only gen if missing to save time? Or usually just gen
                base_rev = (info.get('totalRevenue') or 10000000000) / 10000000 
                rev_hist = []
                prof_hist = []
                for i in range(5):
                    year = 2020 + i
                    growth = random.uniform(1.05, 1.20)
                    base_rev *= growth
                    net_profit = base_rev * random.uniform(0.10, 0.20)
                    rev_hist.append({"year": str(year), "value": round(base_rev, 2)})
                    prof_hist.append({"year": str(year), "value": round(net_profit, 2)})
                fund.revenue_history = json.dumps(rev_hist)
                fund.profit_history = json.dumps(prof_hist)
                
            if not fund.shareholding:
                fund.shareholding = json.dumps({
                    "Promoters": round(random.uniform(40, 70), 2),
                    "FII": round(random.uniform(10, 30), 2),
                    "DII": round(random.uniform(5, 20), 2),
                    "Public": round(random.uniform(5, 15), 2)
                })

            # Upsert Technicals
            tech_stmt = select(Technicals).where(Technicals.stock_id == stock.id)
            result = await db.execute(tech_stmt)
            tech = result.scalars().first()
            
            if not tech:
                tech = Technicals(stock_id=stock.id)
                db.add(tech)
            
            tech.rsi_14 = tech_data.get('rsi_14', 50.0)
            tech.macd = tech_data.get('macd', 0.0)
            tech.sma_50 = tech_data.get('sma_50', 0.0)
            tech.sma_200 = tech_data.get('sma_200', 0.0)
            tech.volume = info.get('volume')
            tech.pivot_point = tech_data.get('pivot_point', 0.0)
            tech.r1 = tech_data.get('r1', 0.0)
            tech.s1 = tech_data.get('s1', 0.0)
            
            # Upsert News
            from models import News
            if yf_news:
                for item in yf_news[:3]:
                    headline = item.get('title')
                    if not headline: continue
                    news_stmt = select(News).where(News.stock_id == stock.id, News.headline == headline)
                    res = await db.execute(news_stmt)
                    if res.scalars().first(): continue
                    
                    sentiment = "NEUTRAL"
                    lower_hl = headline.lower()
                    if any(x in lower_hl for x in ['growth', 'profit', 'rise', 'soar', 'buy', 'bull']): sentiment = "POSITIVE"
                    elif any(x in lower_hl for x in ['loss', 'drop', 'fall', 'plunge', 'sell', 'bear']): sentiment = "NEGATIVE"
                    
                    new_news = News(stock_id=stock.id, headline=headline, summary=item.get('link'), sentiment=sentiment, url=item.get('link'))
                    db.add(new_news)
            
            count += 1
            if count % 10 == 0:
                await db.commit() # Commit every 10 to save roundtrips
                
        except Exception as e:
            print(f"Error updating DB for {clean_symbol}: {e}")
            await db.rollback() # Rollback on error but continue loop?
            
    await db.commit() # Final commit
    duration = asyncio.get_event_loop().time() - start_time
    print(f"🏁 Ingestion complete. Updated {count} stocks in {duration:.2f} seconds.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(fetch_and_update_data())
