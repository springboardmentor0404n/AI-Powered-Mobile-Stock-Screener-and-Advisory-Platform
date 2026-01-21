from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import time
from datetime import datetime, timedelta
import pytz
from yahoo_service import get_yahoo_history
from angelone_service import get_stock_history_angel
from chart_cache import chart_cache

router = APIRouter(prefix="/api/candles", tags=["candles"])

# Interval mapping
YAHOO_INTERVALS = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "1d": "1d",
    "1w": "1wk",
    "1mo": "1mo"
}

ANGEL_INTERVALS = {
    "1m": "ONE_MINUTE",
    "5m": "FIVE_MINUTE",
    "15m": "FIFTEEN_MINUTE",
    "30m": "THIRTY_MINUTE",
    "1h": "ONE_HOUR",
    "1d": "ONE_DAY"
}

def convert_to_unix(candles: list, interval: str) -> list:
    """Convert candles to proper format with UNIX timestamps"""
    result = []
    ist = pytz.timezone('Asia/Kolkata')
    
    for candle in candles:
        try:
            # Parse date string to datetime
            if isinstance(candle.get("date"), str):
                dt = datetime.fromisoformat(candle["date"].replace('Z', '+00:00'))
            else:
                dt = candle["date"]
            
            # Check if this looks like an IST timestamp (from AngelOne)
            # AngelOne returns timestamps like "2024-01-07 09:15:00" which are in IST
            if dt.tzinfo is None:
                # If the time looks like market hours (9-15), it's probably IST
                if isinstance(candle.get("date"), str) and 'T' not in candle["date"]:
                    # AngelOne format: "2024-01-07 09:15:00" - treat as IST
                    dt = ist.localize(dt)
                else:
                    # Yahoo/other format with 'T' or 'Z' - treat as UTC
                    dt = pytz.utc.localize(dt)
            
            # Convert to UNIX timestamp (seconds)
            unix_time = int(dt.timestamp())
            
            result.append({
                "time": unix_time,
                "open": float(candle["open"]),
                "high": float(candle["high"]),
                "low": float(candle["low"]),
                "close": float(candle["close"]),
                "volume": int(candle.get("volume", 0))
            })
        except Exception as e:
            print(f"[CANDLES] Error converting candle: {e}")
            continue
    
    # Sort ascending by time (oldest first)
    result.sort(key=lambda x: x["time"])
    
    return result

def filter_candles_before(candles: list, to_timestamp: int) -> list:
    """Filter candles to only include those before 'to' timestamp"""
    return [c for c in candles if c["time"] < to_timestamp]

@router.get("/")
async def get_candles(
    symbol: str,
    interval: str = Query(..., description="1m, 5m, 15m, 30m, 1h, 1d, 1w, 1mo"),
    to: Optional[int] = Query(None, description="UNIX timestamp - fetch candles before this time"),
    limit: Optional[int] = Query(None, description="Number of candles to return (default: all available)"),
    days: Optional[int] = Query(None, description="Number of days to fetch (overrides auto-adjust)")
):
    """
    Get historical candles for a symbol
    
    Rules:
    - Returns candles sorted ASCENDING (oldest first)
    - Time is UNIX seconds (not milliseconds)
    - If 'to' provided, returns candles BEFORE that timestamp
    - If 'to' not provided, returns most recent candles
    - If 'limit' not provided, returns all available data
    - If 'days' not provided, auto-adjusts based on interval
    
    Auto-adjust defaults:
    - 1m, 5m: 1 day
    - 15m: 7 days
    - 30m: 14 days
    - 1h: 28 days
    - 1d: 270 days (9 months)
    - 1w: 730 days (2 years)
    """
    
    try:
        # Check cache first for instant loading
        cached_data = chart_cache.get_cached_chart(symbol, interval)
        if cached_data and not to and not limit:  # Only use cache for full chart requests
            print(f"[CANDLES] Serving from cache: {symbol} {interval}")
            return cached_data
        
        # Determine data source based on interval
        is_intraday = interval in ["1m", "5m", "15m", "30m", "1h"]
        
        candles = []
        
        if is_intraday:
            # Use Angel One for intraday
            print(f"[CANDLES] Fetching intraday data from Angel One: {symbol} {interval}")
            angel_interval = ANGEL_INTERVALS.get(interval, "ONE_MINUTE")
            
            # Determine days: manual override > auto-adjust defaults
            if days:
                # Manual adjustment
                fetch_days = days
            elif interval in ["1m", "5m"]:
                fetch_days = 1  # 1 day for 1m and 5m
            elif interval == "15m":
                fetch_days = 7  # 7 days for 15m
            elif interval == "30m":
                fetch_days = 14  # 14 days for 30m
            elif interval == "1h":
                fetch_days = 28  # 28 days for 1h
            else:
                fetch_days = 30  # fallback
            
            raw_candles = await get_stock_history_angel(symbol, days=fetch_days, interval=angel_interval)
            print(f"[CANDLES] AngelOne returned {len(raw_candles)} raw candles")
            candles = convert_to_unix(raw_candles, interval)
            print(f"[CANDLES] Converted to {len(candles)} unix candles")
            
        else:
            # Use Yahoo Finance for daily+
            print(f"[CANDLES] Fetching daily data from Yahoo: {symbol} {interval}")
            yahoo_interval = YAHOO_INTERVALS.get(interval, "1d")
            
            # Determine period: manual override > auto-adjust defaults
            if days:
                # Manual adjustment - convert days to period
                if days > 1825:  # 5 years
                    period = "max"
                elif days > 730:  # 2 years
                    period = "5y"
                elif days > 365:  # 1 year
                    period = "2y"
                elif days > 180:
                    period = "1y"
                elif days > 90:
                    period = "6mo"
                elif days > 30:
                    period = "1mo"
                elif days > 7:
                    period = "1mo"
                elif days > 1:
                    period = "5d"
                else:
                    period = "1d"
            elif interval == "1d":
                period = "1y"  # 9 months ≈ 1 year
            elif interval == "1w":
                period = "2y"  # 2 years
            else:  # 1mo
                period = "max"
            
            raw_candles = await get_yahoo_history(symbol, period=period, interval=yahoo_interval)
            print(f"[CANDLES] Yahoo returned {len(raw_candles)} raw candles")
            candles = convert_to_unix(raw_candles, interval)
            print(f"[CANDLES] Converted to {len(candles)} unix candles")
        
        # Apply 'to' filter if provided
        if to:
            candles = filter_candles_before(candles, to)
        
        # Apply limit (take last N candles if we have more) - only if limit specified
        if limit and len(candles) > limit:
            candles = candles[-limit:]
        
        if len(candles) == 0:
            print(f"[CANDLES] WARNING: No data available for {symbol} {interval}")
        else:
            print(f"[CANDLES] Returning {len(candles)} candles for {symbol} {interval}")
        
        return candles
        
    except Exception as e:
        print(f"[CANDLES ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch candles: {str(e)}")
