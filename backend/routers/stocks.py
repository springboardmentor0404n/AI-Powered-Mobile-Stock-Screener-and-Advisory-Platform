from fastapi import APIRouter, HTTPException, status, Header, Depends
from pydantic import BaseModel
from typing import Optional, List
import os
import json
from dependencies import get_current_user
from angelone_service import search_stocks, get_stock_history as get_angel_history
from yahoo_service import get_yahoo_history, get_stock_fundamentals, get_batch_stock_data
import ai_search

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

# Models
class ScreenerQuery(BaseModel):
    query: str

@router.get("/history")
async def stock_history_endpoint(symbol: str, days: int = 30, interval: str = "1D"):
    """
    Get historical data with smart routing.
    - Intraday (1m, 5m, 15m, 30m, 1H) -> Angel One
    - Daily+ (1D, 1W, 1M) -> Yahoo Finance
    """
    
    # Map frontend interval to backend API constants
    angel_interval_map = {
        "1m": "ONE_MINUTE",
        "5m": "FIVE_MINUTE",
        "15m": "FIFTEEN_MINUTE",
        "30m": "THIRTY_MINUTE",
        "1H": "ONE_HOUR",
        "1D": "ONE_DAY"
    }
    
    yahoo_interval_map = {
        "1D": "1d",
        "1W": "1wk",
        "1M": "1mo"
    }

    # Decide Source
    # Priority: Use Angel One for Intraday (1m-1H)
    if interval in ["1m", "5m", "15m", "30m", "1H"]:
        api_interval = angel_interval_map.get(interval, "ONE_MINUTE")
        # Angel One logic
        print(f"[HISTORY] Using Angel One for {symbol} (Intraday: {interval})")
        return {"history": await get_angel_history(symbol, days=days, interval=api_interval)}
    
    # Use Yahoo for Daily/Weekly/Monthly (Long term)
    else:
        y_interval = yahoo_interval_map.get(interval, "1d")
        
        # Yahoo Period Logic
        period = f"{days}d"
        if days > 2000: period = "max"
        elif days > 700: period = "5y"
        elif days > 300: period = "1y"
        elif days > 150: period = "6mo"
        elif days > 30: period = "3mo"
        
        print(f"[HISTORY] Using Yahoo for {symbol} (Daily+: {interval}, Period: {period})")
        return {"history": await get_yahoo_history(symbol, period=period, interval=y_interval)}

@router.get("/details/{symbol}")
async def stock_details_endpoint(symbol: str):
    """
    Get fundamental details from Yahoo Finance.
    """
    return await get_stock_fundamentals(symbol)

@router.get("/search")
async def search_stocks_endpoint(q: str = None):
    """
    Search for stocks using instrument master and fetch real-time prices.
    """
    if not q:
        return {"results": []}
    
    # Hybrid Search Strategy:
    # 1. Try Direct Search first (Fuzzy match on Symbol/Name)
    print(f"[STOCK SEARCH] Direct Query: '{q}'")
    direct_results = await search_stocks(q, use_ai=False)
    
    if direct_results:
        print(f"[STOCK SEARCH] Direct match found {len(direct_results)} results")
        
        # Fetch prices for all results
        enriched_results = []
        for result in direct_results:
            try:
                # Get fundamentals which includes price data
                symbol = result.get("symbol", "")
                exchange = result.get("exchange", "NSE")
                
                # Get price data from Yahoo
                fundamentals = await get_stock_fundamentals(symbol)
                
                enriched_result = {
                    "symbol": symbol,
                    "company": result.get("name", ""),
                    "name": result.get("name", ""),
                    "exchange": exchange,
                    "price": fundamentals.get("current_price", 0),
                    "change": fundamentals.get("change", 0),
                    "changePercent": fundamentals.get("change_percent", 0),
                    "pe_ratio": fundamentals.get("pe_ratio", 0),
                    "market_cap": fundamentals.get("market_cap", 0),
                    "sector": fundamentals.get("sector", "")
                }
                enriched_results.append(enriched_result)
            except Exception as e:
                print(f"[STOCK SEARCH] Error enriching {result.get('symbol')}: {e}")
                # Add without price data if enrichment fails
                enriched_results.append({
                    "symbol": result.get("symbol", ""),
                    "company": result.get("name", ""),
                    "name": result.get("name", ""),
                    "exchange": result.get("exchange", "NSE"),
                    "price": 0,
                    "change": 0,
                    "changePercent": 0
                })
        
        return {"results": enriched_results}
        
    # 2. If no results, try AI Search (Semantic interpretation)
    print(f"[STOCK SEARCH] No direct match, attempting AI search for: '{q}'")
    try:
        ai_results = await search_stocks(q, use_ai=True)
        print(f"[STOCK SEARCH] AI match found {len(ai_results)} results")
        
        # Enrich AI results with price data too
        enriched_results = []
        for result in ai_results:
            try:
                symbol = result.get("symbol", "")
                exchange = result.get("exchange", "NSE")
                
                fundamentals = await get_stock_fundamentals(symbol)
                
                enriched_result = {
                    "symbol": symbol,
                    "company": result.get("name", ""),
                    "name": result.get("name", ""),
                    "exchange": exchange,
                    "price": fundamentals.get("current_price", 0),
                    "change": fundamentals.get("change", 0),
                    "changePercent": fundamentals.get("change_percent", 0),
                    "pe_ratio": fundamentals.get("pe_ratio", 0),
                    "market_cap": fundamentals.get("market_cap", 0),
                    "sector": fundamentals.get("sector", "")
                }
                enriched_results.append(enriched_result)
            except Exception as e:
                print(f"[STOCK SEARCH] Error enriching {result.get('symbol')}: {e}")
                enriched_results.append({
                    "symbol": result.get("symbol", ""),
                    "company": result.get("name", ""),
                    "name": result.get("name", ""),
                    "exchange": result.get("exchange", "NSE"),
                    "price": 0,
                    "change": 0,
                    "changePercent": 0
                })
        
        return {"results": enriched_results}
    except Exception as e:
        print(f"[STOCK_SEARCH] Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while searching stocks: {str(e)}"
        )

@router.get("/insight/{symbol}")
async def stock_insight_endpoint(symbol: str):
    """
    Get AI-generated insight and sentiment for a stock.
    """
    try:
        # Use simple caching strategy if needed, for now live generation
        insight = ai_search.generate_stock_insight(symbol)
        return insight
    except Exception as e:
        print(f"[INSIGHT ERROR] {e}")
        return {"sentiment": "Neutral", "insight": "Insight unavailable.", "color": "#9CA3AF"}

# Screener Logic (Updated with Google GenAI Migration will happen in a separate step, keeping logic for now)
# Wait, I should probably migrate it NOW while extracting.
# The plan says "Upgrade AI Dependencies" after modularization, but since I'm rewriting the file, I might as well?
# Actually good practice is to do one thing at a time. I will copy existing logic and then migrate in the next pass.
# BUT, `server.py` had robust screener logic inline. I need to move that here.
# I'll create `backend/routers/screener.py` or keep it in stocks? The plan said `api/stocks/*` and `api/screener/*`.
# Let's put screener in its own router file `backend/routers/screener.py` to keep it clean.

# So this file `stocks.py` is good for history/details/search.
