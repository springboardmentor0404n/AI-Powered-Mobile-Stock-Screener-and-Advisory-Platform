import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import asyncio
# from redis_cache import market_data_cache

# Cache TTLs
HISTORY_TTL = 3600  # 1 hour
FUNDAMENTALS_TTL = 86400  # 24 hours
BATCH_TTL = 300  # 5 minutes
QUOTE_TTL = 30  # 30 seconds for quotes

# In-memory cache for Yahoo quotes
_yahoo_quote_cache = {}

def retry_on_failure(retries=3, delay=1):
    """Decorator to retry function on failure"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            for i in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    print(f"[YAHOO] Retry {i+1}/{retries} for {func.__name__} failed: {e}")
                    import time
                    time.sleep(delay * (i + 1)) # Backoff
            print(f"[YAHOO] All retries failed for {func.__name__}")
            raise last_exception
        return wrapper
    return decorator

async def get_yahoo_quote(symbol: str, exchange: str = "NSE"):
    """
    Fetch real-time quote from Yahoo Finance (fallback for missing Angel One stocks)
    """
    global _yahoo_quote_cache
    
    cache_key = f"yahoo_quote:{symbol}:{exchange}"
    
    # Check in-memory cache
    if cache_key in _yahoo_quote_cache:
        data, timestamp = _yahoo_quote_cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=QUOTE_TTL):
            return data
    
    # Fetch from Yahoo Finance
    data = await asyncio.to_thread(_fetch_yahoo_quote_sync, symbol, exchange)
    
    # Cache the result
    if data:
        _yahoo_quote_cache[cache_key] = (data, datetime.now())
    
    return data

@retry_on_failure(retries=2, delay=1)
def _fetch_yahoo_quote_sync(symbol: str, exchange: str = "NSE"):
    """
    Sync function to fetch quote from Yahoo Finance with fallbacks
    """
    try:
        # Normalize symbol for Yahoo
        ticker_symbol = symbol
        
        # Remove Angel One suffixes
        if "-EQ" in ticker_symbol:
            ticker_symbol = ticker_symbol.replace("-EQ", "")
        
        # Add exchange suffix
        if exchange == "BSE":
            if not ticker_symbol.endswith(".BO"):
                ticker_symbol = f"{ticker_symbol}.BO"
        else:  # NSE
            if not ticker_symbol.endswith(".NS"):
                ticker_symbol = f"{ticker_symbol}.NS"
        
        # print(f"[YAHOO] Fetching quote for {ticker_symbol}")
        
        stock = yf.Ticker(ticker_symbol)
        
        # Method 1: Try fast_info (often faster and more reliable for real-time)
        try:
            fast_info = stock.fast_info
            ltp = fast_info.last_price
            previous_close = fast_info.previous_close
            open_price = fast_info.open
            high = fast_info.day_high
            low = fast_info.day_low
            volume = fast_info.last_volume
            
            # If LTP is valid, use it
            if ltp and ltp > 0:
                # Calculate change
                change = 0
                change_percent = 0
                if previous_close and previous_close > 0:
                    change = ltp - previous_close
                    change_percent = (change / previous_close) * 100
                
                # print(f"[YAHOO] fast_info Quote for {symbol}: LTP={ltp}")
                return _format_quote(symbol, exchange, ltp, previous_close, open_price, high, low, volume, change, change_percent)
        except Exception as e:
             # print(f"[YAHOO] fast_info failed for {symbol}: {e}")
             pass

        # Method 2: Try standard info (can be slow or return None)
        info = stock.info
        if info:
            ltp = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            if ltp and ltp > 0:
                previous_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
                open_price = info.get("open") or info.get("regularMarketOpen", 0)
                high = info.get("dayHigh") or info.get("regularMarketDayHigh", 0)
                low = info.get("dayLow") or info.get("regularMarketDayLow", 0)
                volume = info.get("volume") or info.get("regularMarketVolume", 0)
                
                change = 0
                change_percent = 0
                if previous_close and previous_close > 0:
                    change = ltp - previous_close
                    change_percent = (change / previous_close) * 100
                
                print(f"[YAHOO] info Quote for {symbol}: LTP={ltp}")
                return _format_quote(symbol, exchange, ltp, previous_close, open_price, high, low, volume, change, change_percent)

        # Method 3: Fallback to 1-day history (Last resort)
        print(f"[YAHOO] Falling back to history for {symbol}")
        hist = stock.history(period="1d")
        if not hist.empty:
            last_row = hist.iloc[-1]
            ltp = float(last_row["Close"])
            # prev close is harder here without more history, assume Open approx or fetch 2d
            # Let's try 2d for better prev close
            hist2d = stock.history(period="5d") # Get a few days to be sure
            previous_close = ltp # Default
            if len(hist2d) >= 2:
                previous_close = float(hist2d.iloc[-2]["Close"])
            
            open_price = float(last_row["Open"])
            high = float(last_row["High"])
            low = float(last_row["Low"])
            volume = int(last_row["Volume"])
            
            change = ltp - previous_close
            change_percent = (change / previous_close) * 100 if previous_close > 0 else 0
            
            print(f"[YAHOO] History Quote for {symbol}: LTP={ltp}")
            return _format_quote(symbol, exchange, ltp, previous_close, open_price, high, low, volume, change, change_percent)

        print(f"[YAHOO] All methods failed for {symbol}")
        return None
        
    except Exception as e:
        print(f"[YAHOO] Error fetching quote for {symbol}: {e}")
        return None

def _format_quote(symbol, exchange, ltp, prev_close, open_p, high, low, vol, change, change_pct):
    return {
        "symbol": f"{symbol}.{exchange}",
        "name": symbol, # Ideally long name, but symbol is safe fallback
        "exchange": exchange,
        "ltp": float(ltp),
        "close": float(ltp),
        "previous_close": float(prev_close),
        "open": float(open_p),
        "high": float(high),
        "low": float(low),
        "volume": int(vol),
        "change": round(change, 2),
        "changePercent": round(change_pct, 2),
        "date": datetime.now().isoformat()
    }

async def get_yahoo_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Fetch historical data from Yahoo Finance with Caching.
    """
    cache_key = f"history:{symbol}:{period}:{interval}"
    
    # Try Cache first
    from market_cache import market_data_cache
    cached_data = await market_data_cache.get(cache_key)
    if cached_data:
        print(f"[YAHOO] Cache hit for history: {symbol}")
        return cached_data

    # Fetch from API (in thread pool)
    data = await asyncio.to_thread(_fetch_yahoo_history_sync, symbol, period, interval)
    
    # Cache the result
    if data:
        await market_data_cache.set(cache_key, data, ttl=HISTORY_TTL)
        
    return data

def _fetch_yahoo_history_sync(symbol: str, period: str, interval: str):
    """
    Internal sync function to fetch from Yahoo
    """
    try:
        # Normalize symbol for Yahoo
        ticker_symbol = symbol
        
        # Remove Angel One suffixes like -EQ.XNSE or .XNSE
        if "-EQ" in ticker_symbol:
            ticker_symbol = ticker_symbol.replace("-EQ", "")
        
        if ticker_symbol.endswith(".XNSE"):
             ticker_symbol = ticker_symbol.replace(".XNSE", ".NS")
        elif ticker_symbol.endswith(".XBSE"):
             ticker_symbol = ticker_symbol.replace(".XBSE", ".BO")
        
        # If no suffix, assume NSE (.NS)
        if not ticker_symbol.endswith(".NS") and not ticker_symbol.endswith(".BO"):
             ticker_symbol = f"{ticker_symbol}.NS"
             
        print(f"[YAHOO] Fetching {ticker_symbol} period={period} interval={interval}")
        
        # Yahoo Finance period mapping
        stock = yf.Ticker(ticker_symbol)
        history = stock.history(period=period, interval=interval)
        
        print(f"[YAHOO] Got {len(history)} rows for {ticker_symbol}")
        
        if history.empty:
            print(f"[YAHOO] No data returned for {ticker_symbol} period={period} interval={interval}")
            return []

        # Reset index to make Date a column and convert to list of dicts
        history.reset_index(inplace=True)
        
        # Normalize columns
        data = []
        for index, row in history.iterrows():
            data.append({
                "date": row["Date"].isoformat(),
                "open": row["Open"],
                "high": row["High"],
                "low": row["Low"],
                "close": row["Close"],
                "volume": row["Volume"]
            })
            
        return data
    except Exception as e:
        print(f"[YAHOO] Error fetching history for {symbol}: {e}")
        return []

async def get_stock_fundamentals(symbol: str):
    """
    Fetch fundamental data with Caching
    """
    cache_key = f"fundamentals:{symbol}"
    
    # Try Cache
    from market_cache import market_data_cache
    cached_data = await market_data_cache.get(cache_key)
    if cached_data:
        return cached_data
        
    # Fetch from API
    data = await asyncio.to_thread(_fetch_stock_fundamentals_sync, symbol)
    
    # Save to Cache
    if data:
        await market_data_cache.set(cache_key, data, ttl=FUNDAMENTALS_TTL)
        
    return data

def _fetch_stock_fundamentals_sync(symbol: str):
    """
    Internal sync function for fundamentals
    """
    try:
        # Normalize symbol for Yahoo (Copy logic from above)
        ticker_symbol = symbol
        
        # Skip normalization for indices (starting with ^)
        if not ticker_symbol.startswith("^"):
            if "-EQ" in ticker_symbol: ticker_symbol = ticker_symbol.replace("-EQ", "")
            if ticker_symbol.endswith(".XNSE"): ticker_symbol = ticker_symbol.replace(".XNSE", ".NS")
            elif ticker_symbol.endswith(".XBSE"): ticker_symbol = ticker_symbol.replace(".XBSE", ".BO")
            if not ticker_symbol.endswith(".NS") and not ticker_symbol.endswith(".BO"): ticker_symbol = f"{ticker_symbol}.NS"
        
        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        
        # Calculate accurate price and percentage change
        current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        previous_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
        
        # Calculate change and percentage
        if previous_close and previous_close > 0 and current_price:
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
        else:
            change = 0
            change_percent = 0
        
        return {
            "symbol": symbol,
            "company_name": info.get("longName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0),
            "pb_ratio": info.get("priceToBook", 0),
            "dividend_yield": info.get("dividendYield", 0),
            "beta": info.get("beta", 0),
            "52_week_high": info.get("fiftyTwoWeekHigh", 0),
            "52_week_low": info.get("fiftyTwoWeekLow", 0),
            "business_summary": info.get("longBusinessSummary", ""),
            "current_price": current_price,
            "previous_close": previous_close,
            "change": round(change, 2),
            "change_percent": round(change_percent, 2)
        }
    except Exception as e:
        print(f"[YAHOO] Error fetching fundamentals for {symbol}: {e}")
        return {}

async def get_batch_stock_data(symbols: list):
    """
    Fetch batch data with Redis caching
    """
    if not symbols:
        return []
        
    # Sort to ensure consistent cache key
    sorted_symbols = sorted(symbols)
    key_hash = hash(",".join(sorted_symbols)) # Shorten key if list is long? 
    # Better: just use join if not too long. Redis keys can be long.
    # But for safety, let's limit key length or use a hash if really needed. 
    # For now, simplistic approach.
    cache_key = f"batch:{','.join(sorted_symbols)}"
    
    from market_cache import market_data_cache
    cached_data = await market_data_cache.get(cache_key)
    if cached_data:
        return cached_data
        
    data = await asyncio.to_thread(_fetch_batch_stock_data_sync, symbols)
    
    if data:
        await market_data_cache.set(cache_key, data, ttl=BATCH_TTL)
        
    return data

def _fetch_batch_stock_data_sync(symbols: list):
    try:
        # Tickers need .NS suffix
        tickers = [f"{s}.NS" if not s.endswith(".NS") and not s.endswith(".BO") else s for s in symbols]
        string_tickers = " ".join(tickers)
        
        # Batch fetch
        data = yf.Tickers(string_tickers)
        
        results = []
        for symbol, ticker_obj in data.tickers.items():
            try:
                info = ticker_obj.info
                # Map back to simple symbol (remove .NS)
                clean_symbol = symbol.replace(".NS", "").replace(".BO", "")
                
                # Calculate accurate price and percentage change
                current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
                previous_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
                
                # Calculate change and percentage
                if previous_close and previous_close > 0 and current_price:
                    change = current_price - previous_close
                    change_percent = (change / previous_close) * 100
                else:
                    change = 0
                    change_percent = 0
                
                results.append({
                    "symbol": clean_symbol,
                    "company": info.get("longName", clean_symbol),
                    "price": round(current_price, 2),
                    "change": round(change, 2),
                    "changePercent": round(change_percent, 2),
                    "pe_ratio": round(info.get("trailingPE", 0), 2) if info.get("trailingPE") else 0,
                    "peg_ratio": round(info.get("pegRatio", 0), 2) if info.get("pegRatio") else 0,
                    "debt_to_fcf": round(info.get("debtToEquity", 0), 2),
                    "growth": f"{info.get('earningsGrowth', 0) * 100:.1f}%",
                    "sector": info.get("sector", "Unknown"),
                    "exchange": "NSE"
                })
            except Exception as e:
                print(f"[YAHOO] Error processing batch ticker {symbol}: {e}")
                
        return results
    except Exception as e:
        print(f"[YAHOO] Batch fetch error: {e}")
        return []

def search_yahoo_screener(query: str):
    """
    Mock implementation of a screener using Yahoo data.
    In a real-world scenario, you'd likely valid symbols first or use a pre-built DB.
    For this 'MVP+': We will use the hardcoded list but fill it with REAL Yahoo data.
    """
    # This function is a helper to update our "Mock DB" with real values on the fly if needed
    pass
