from fastapi import APIRouter, Header, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncio
from dependencies import get_current_user, get_watchlist_collection
from angelone_service import (
    get_stock_quote_angel,
    get_stock_quote_angel_async,
    get_derivatives_gainers_losers,
    get_pcr_volume,
    get_oi_buildup,
    get_equity_gainers_losers
)
from yahoo_service import get_stock_fundamentals
from finnhub_service import finnhub_service
# from market_cache import market_data_cache
from market_cache import market_data_cache
import random

router = APIRouter(prefix="/api", tags=["market"])

# Models
class WatchlistItem(BaseModel):
    symbol: str
    company: str
    exchange: str = "NSE"

@router.get("/market/indices")
async def get_market_indices(force_refresh: bool = Query(False, description="Force refresh cache")):
    """
    Get real-time market indices (Nifty 50, Sensex) with caching
    """
    try:
        # Check cache first
        if not force_refresh:
            cached_data = await market_data_cache.get_indices()
            if cached_data:
                return cached_data
        
        # Fetch fresh data
        indices = []
        
        # 1. Nifty 50 - Try Angel One first
        nifty_quote = await get_stock_quote_angel_async("Nifty 50", "NSE")
        if not nifty_quote:
            nifty_quote = await get_stock_quote_angel_async("NIFTY", "NSE")
        
        if nifty_quote:
            curr = nifty_quote.get("ltp") or nifty_quote.get("close", 0)
            chg = nifty_quote.get("change", 0)
            pct = nifty_quote.get("changePercent", 0)
            
            indices.append({
                "name": "Nifty 50",
                "value": round(curr, 2),
                "change": round(chg, 2),
                "changePercent": round(pct, 2)
            })
            print(f"[MARKET] Nifty 50: {curr:.2f} ({pct:+.2f}%)")
        
        # 2. Sensex - Try Angel One first, then Yahoo Finance
        sensex_quote = None
        try:
            # Try Angel One with various symbol names
            sensex_quote = await get_stock_quote_angel_async("SENSEX", "BSE")
            if not sensex_quote:
                sensex_quote = await get_stock_quote_angel_async("BSE SENSEX", "BSE")
            if not sensex_quote:
                sensex_quote = await get_stock_quote_angel_async("Sensex", "BSE")
            
            if sensex_quote:
                curr = sensex_quote.get("ltp") or sensex_quote.get("close", 0)
                chg = sensex_quote.get("change", 0)
                pct = sensex_quote.get("changePercent", 0)
                
                indices.append({
                    "name": "Sensex",
                    "value": round(curr, 2),
                    "change": round(chg, 2),
                    "changePercent": round(pct, 2)
                })
                print(f"[MARKET] Sensex (Angel One): {curr:.2f} ({pct:+.2f}%)")
        except Exception as e:
            print(f"[MARKET] Angel One Sensex failed: {e}")
        
        # Fallback to Yahoo Finance for Sensex if Angel One failed
        if not sensex_quote:
            try:
                print("[MARKET] Trying Yahoo Finance for Sensex...")
                sensex_data = await get_stock_fundamentals("^BSESN")
                if sensex_data and sensex_data.get("current_price", 0) > 0:
                    indices.append({
                        "name": "Sensex",
                        "value": round(sensex_data.get("current_price", 0), 2),
                        "change": round(sensex_data.get("change", 0), 2),
                        "changePercent": round(sensex_data.get("change_percent", 0), 2)
                    })
                    print(f"[MARKET] Sensex (Yahoo): {sensex_data.get('current_price', 0):.2f}")
            except Exception as e:
                print(f"[MARKET ERROR] Yahoo Sensex also failed: {e}")
            
        # Fallback if API fails (to avoid empty screen)
        if not indices:
             return {"indices": [{"name": "Market Data Unavail", "value": 0, "change": 0, "changePercent": 0}]}

        result = {"indices": indices}
        
        # Cache the result
        await market_data_cache.set_indices(result)
        
        return result
    except Exception as e:
        print(f"[MARKET ERROR] {e}")
        return {"indices": []}

@router.get("/market/highlights")
async def get_market_highlights(force_refresh: bool = Query(False, description="Force refresh cache")):
    """
    Get dynamic market highlights using AngelOne API with caching
    """
    # Check cache first
    if not force_refresh:
        cached_highlights = await market_data_cache.get_highlights()
        if cached_highlights:
            return cached_highlights
    
    highlights = []
    
    try:
        # Fetch Nifty 50 data
        nifty_data = await get_stock_quote_angel_async("NIFTY 50", "NSE")
        
        if nifty_data:
            ltp = nifty_data.get("ltp", 0)
            prev_close = nifty_data.get("close", 0)
            change = ltp - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0
            
            # Highlight 1: Market Trend
            if change > 0:
                highlights.append({
                    "id": 1, 
                    "icon": "trending-up", 
                    "text": f"Nifty 50 up {abs(change_pct):.2f}% at {ltp:.2f}", 
                    "color": "#10B981"
                })
            else:
                highlights.append({
                    "id": 1, 
                    "icon": "trending-down", 
                    "text": f"Nifty 50 down {abs(change_pct):.2f}% at {ltp:.2f}", 
                    "color": "#EF4444"
                })
        
        # Fetch top gainers/losers from watchlist stocks
        top_stocks = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"]
        stock_changes = []
        
        for symbol in top_stocks:
            try:
                stock_data = await get_stock_quote_angel_async(symbol, "NSE")
                if stock_data:
                    ltp = stock_data.get("ltp", 0)
                    prev_close = stock_data.get("close", 0)
                    if prev_close:
                        change_pct = ((ltp - prev_close) / prev_close) * 100
                        stock_changes.append({
                            "symbol": symbol,
                            "change": change_pct,
                            "ltp": ltp
                        })
            except:
                continue
        
        # Find top gainer and loser
        if stock_changes:
            stock_changes.sort(key=lambda x: x["change"], reverse=True)
            
            # Top gainer
            if stock_changes[0]["change"] > 0:
                top_gainer = stock_changes[0]
                highlights.append({
                    "id": 2,
                    "icon": "arrow-up-circle",
                    "text": f"{top_gainer['symbol']} surges {top_gainer['change']:.2f}% today",
                    "color": "#10B981"
                })
            
            # Top loser
            if len(stock_changes) > 1 and stock_changes[-1]["change"] < 0:
                top_loser = stock_changes[-1]
                highlights.append({
                    "id": 3,
                    "icon": "arrow-down-circle",
                    "text": f"{top_loser['symbol']} falls {abs(top_loser['change']):.2f}% today",
                    "color": "#EF4444"
                })
        
        # AI Screener recommendation
        highlights.append({
            "id": 4,
            "icon": "bulb",
            "text": "Check AI Screener for value picks",
            "color": "#3B82F6"
        })
            
    except Exception as e:
        print(f"[HIGHLIGHTS ERROR] {e}")
        pass
        
    if not highlights:
        highlights = [{
            "id": 1, "icon": "information-circle", "text": "Market data currently unavailable", "color": "#6B7280"
        }]
    
    # Cache the result
    await market_data_cache.set_highlights(highlights)
    
    return highlights

@router.get("/market/events")
async def get_market_events():
    """Get upcoming market events"""
    # In a real app, scrape or fetch from API
    # For now, return a static list that looks real
    return [
        { "id": 1, "symbol": 'TCS', "event": 'Earnings', "date": '12 Apr', "type": 'earnings' },
        { "id": 2, "symbol": 'INFY', "event": 'Earnings', "date": '14 Apr', "type": 'earnings' },
        { "id": 3, "symbol": 'WIPRO', "event": 'Buyback', "date": '20 Apr', "type": 'buyback' },
        { "id": 4, "symbol": 'HDFCBANK', "event": 'Dividend', "date": '25 Apr', "type": 'dividend' },
    ]

@router.get("/market/movers")
async def get_market_movers(force_refresh: bool = Query(False, description="Force refresh cache")):
    """Get top gainers and losers from Indian stock market with caching"""
    try:
        # Check cache first
        if not force_refresh:
            cached_movers = await market_data_cache.get_movers()
            if cached_movers:
                return cached_movers
        
        # Use Angel One with curated list of active stocks (most reliable for Indian market)
        print("[MOVERS] Fetching from Angel One active stocks...")
        result = await asyncio.to_thread(get_equity_gainers_losers, segment="nse")
        
        # Only fallback to NSE/Yahoo if Angel One completely fails
        # if not result or (not result.get("gainers") and not result.get("losers")):
        #    print("[MOVERS] Angel One failed, trying NSE...")
        #    result = get_nse_all_market_movers()
        
        if not result:
            result = {"gainers": [], "losers": []}
        
        # Cache the result
        await market_data_cache.set_movers(result)
        
        return result
    except Exception as e:
        print(f"[MOVERS ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {"gainers": [], "losers": []}


# --- Derivatives Market Data Endpoints ---

@router.post("/market/derivatives/gainers-losers")
async def get_derivatives_movers(
    data_type: str = Query(
        default="PercOIGainers",
        description="Type of data: PercOIGainers, PercOILosers, PercPriceGainers, PercPriceLosers"
    ),
    expiry_type: str = Query(
        default="NEAR",
        description="Expiry type: NEAR (current month), NEXT (next month), FAR (month after next)"
    ),
    user: dict = Depends(get_current_user)
):
    """
    Get derivatives gainers and losers data from Angel One API.
    Supports 4 data types: PercOIGainers, PercOILosers, PercPriceGainers, PercPriceLosers
    Supports 3 expiry types: NEAR, NEXT, FAR
    """
    try:
        # Validate data_type
        valid_data_types = ["PercOIGainers", "PercOILosers", "PercPriceGainers", "PercPriceLosers"]
        if data_type not in valid_data_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid data_type. Must be one of: {', '.join(valid_data_types)}"
            )
        
        # Validate expiry_type
        valid_expiry_types = ["NEAR", "NEXT", "FAR"]
        if expiry_type not in valid_expiry_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expiry_type. Must be one of: {', '.join(valid_expiry_types)}"
            )
        
        # Check cache first
        cache_key = f"derivatives_movers_{data_type}_{expiry_type}"
        cached_data = await market_data_cache.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Call Angel One API
        result = get_derivatives_gainers_losers(data_type=data_type, expiry_type=expiry_type)
        
        if not result or "data" not in result:
            return {"data": [], "data_type": data_type, "expiry_type": expiry_type}
        
        # Cache the result for 5 minutes
        await market_data_cache.set_cached_data(cache_key, result, ttl=300)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DERIVATIVES MOVERS ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch derivatives movers: {str(e)}")


@router.get("/market/derivatives/pcr")
async def get_derivatives_pcr(user: dict = Depends(get_current_user)):
    """
    Get Put-Call Ratio (PCR) volume data from Angel One API.
    Returns PCR ratio for various derivative instruments.
    """
    try:
        # Check cache first
        cache_key = "derivatives_pcr"
        cached_data = await market_data_cache.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Call Angel One API
        result = get_pcr_volume()
        
        if not result or "data" not in result:
            return {"data": []}
        
        # Cache the result for 5 minutes
        await market_data_cache.set_cached_data(cache_key, result, ttl=300)
        
        return result
        
    except Exception as e:
        print(f"[DERIVATIVES PCR ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch PCR data: {str(e)}")


@router.post("/market/derivatives/oi-buildup")
async def get_derivatives_oi_buildup(
    data_type: str = Query(
        default="Long Built Up",
        description="Type of OI buildup: Long Built Up, Short Built Up, Short Covering, Long Unwinding"
    ),
    expiry_type: str = Query(
        default="NEAR",
        description="Expiry type: NEAR (current month), NEXT (next month), FAR (month after next)"
    ),
    user: dict = Depends(get_current_user)
):
    """
    Get Open Interest (OI) BuildUp analysis from Angel One API.
    Supports 4 data types: Long Built Up, Short Built Up, Short Covering, Long Unwinding
    Supports 3 expiry types: NEAR, NEXT, FAR
    """
    try:
        # Validate data_type
        valid_data_types = ["Long Built Up", "Short Built Up", "Short Covering", "Long Unwinding"]
        if data_type not in valid_data_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid data_type. Must be one of: {', '.join(valid_data_types)}"
            )
        
        # Validate expiry_type
        valid_expiry_types = ["NEAR", "NEXT", "FAR"]
        if expiry_type not in valid_expiry_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expiry_type. Must be one of: {', '.join(valid_expiry_types)}"
            )
        
        # Check cache first
        cache_key = f"derivatives_oi_buildup_{data_type.replace(' ', '_')}_{expiry_type}"
        cached_data = await market_data_cache.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Call Angel One API
        result = get_oi_buildup(data_type=data_type, expiry_type=expiry_type)
        
        if not result or "data" not in result:
            return {"data": [], "data_type": data_type, "expiry_type": expiry_type}
        
        # Cache the result for 5 minutes
        await market_data_cache.set_cached_data(cache_key, result, ttl=300)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DERIVATIVES OI BUILDUP ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch OI buildup data: {str(e)}")


# --- Real Watchlist Endpoints ---

@router.get("/watchlist")
async def get_watchlist(user: dict = Depends(get_current_user)):
    """Get user's real watchlist"""
    try:
        # User ID from the authenticated user token
        user_id = int(user["id"])
        
        # Use the dependencies getter or global
        from dependencies import get_watchlist_collection
        storage = get_watchlist_collection()
        
        saved_stocks = await storage.get_watchlist(user_id)
        
        results = []
        for item in saved_stocks:
            # We fetch real-time price for each
            symbol = item["symbol"]
            exchange = item.get("exchange", "NSE")
            
            try:
                # Sanitise symbol (remove .XNSE extension if present)
                clean_symbol = symbol.split('.')[0]
                quote = await get_stock_quote_angel_async(clean_symbol, exchange)
                price = 0
                change = 0
                pct = 0
                
                if quote:
                    # Use the calculated values from get_stock_quote_angel
                    price = quote.get("ltp") or quote.get("close", 0)
                    change = quote.get("change", 0)
                    pct = quote.get("changePercent", 0)
                
                results.append({
                    "symbol": symbol,
                    "company": item.get("company", symbol),
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "changePercent": round(pct, 2),
                    "exchange": exchange
                })
            except Exception as item_error:
                print(f"[WATCHLIST ITEM ERROR] Failed for {symbol}: {item_error}")
                # Add with zero values or skip? Better to add with zero so user can delete it
                results.append({
                    "symbol": symbol,
                    "company": item.get("company", symbol),
                    "price": 0,
                    "change": 0,
                    "changePercent": 0,
                    "exchange": exchange
                })
            
        return {"stocks": results}
    except Exception as e:
        print(f"[WATCHLIST GET ERROR] {e}")
        return {"stocks": []}

@router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem, user: dict = Depends(get_current_user)):
    """Add stock to watchlist"""
    try:
        user_id = int(user["id"])
        from dependencies import get_watchlist_collection
        storage = get_watchlist_collection()
        
        # Add to storage (handles duplicates via ON CONFLICT)
        success = await storage.add_to_watchlist(user_id, item.symbol, item.exchange)
        if success:
            return {"message": f"Added {item.symbol}"}
        else:
             return {"message": "Failed to add (or already exists)"}

    except Exception as e:
        print(f"[WATCHLIST ADD ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, user: dict = Depends(get_current_user)):
    """Remove stock from watchlist"""
    try:
        user_id = int(user["id"])
        from dependencies import get_watchlist_collection
        storage = get_watchlist_collection()
        
        success = await storage.remove_from_watchlist(user_id, symbol)
        
        if success:
             return {"message": f"Removed {symbol}"}
        else:
             return {"message": "Stock not found or failed to remove"}
             
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/watchlist/check/{symbol}")
async def check_watchlist_status(symbol: str, user: dict = Depends(get_current_user)):
    """Check if a stock is in the user's watchlist"""
    try:
        user_id = int(user["id"])
        from dependencies import get_watchlist_collection
        storage = get_watchlist_collection()
        
        # Get all watchlist items and check if symbol exists
        watchlist = await storage.get_watchlist(user_id)
        exists = any(item["symbol"] == symbol for item in watchlist)
        return {"in_wishlist": exists}
        
    except Exception as e:
        print(f"[WATCHLIST CHECK ERROR] {e}")
        # Return false on error instead of 500 to prevent UI issues
        return {"in_wishlist": False}

# --- Market Snapshot Endpoints ---

@router.post("/market/snapshot/create")
async def create_market_snapshot(user: dict = Depends(get_current_user)):
    """Manually trigger market snapshot creation (Admin/Testing)"""
    try:
        snapshot = await market_data_cache.create_daily_snapshot()
        return {
            "message": "Snapshot created successfully",
            "snapshot": snapshot
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Snapshot creation failed: {str(e)}")

@router.get("/market/snapshot/latest")
async def get_latest_market_snapshot():
    """Get the most recent market snapshot"""
    try:
        snapshot = await market_data_cache.get_latest_snapshot()
        if not snapshot:
            return {"message": "No snapshot available", "snapshot": None}
        return {"snapshot": snapshot}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/snapshot/{date}")
async def get_market_snapshot_by_date(date: str):
    """
    Get market snapshot for a specific date
    Format: YYYY-MM-DD (e.g., 2026-01-13)
    """
    try:
        snapshot = await market_data_cache.get_snapshot_by_date(date)
        if not snapshot:
            return {"message": f"No snapshot found for {date}", "snapshot": None}
        return {"snapshot": snapshot}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/snapshot/compare/{date1}/{date2}")
async def compare_market_snapshots(date1: str, date2: str):
    """
    Compare two market snapshots
    Dates format: YYYY-MM-DD
    """
    try:
        comparison = await market_data_cache.compare_snapshots(date1, date2)
        return {"comparison": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/cache/stats")
async def get_cache_stats():
    """Get cache statistics and configuration"""
    return {
        "ttl_config": market_data_cache.ttl_config,
        "snapshot_stocks_count": len(market_data_cache.snapshot_stocks),
        "scheduler_running": market_data_cache.scheduler_running,
        "warming_running": market_data_cache.warming_running,
        "cache_namespaces": ["market", "market_snapshot"]
    }

@router.get("/market/cache/metrics")
async def get_cache_metrics():
    """Get detailed cache performance metrics"""
    try:
        metrics = market_data_cache.get_cache_metrics()
        return {
            "metrics": metrics,
            "status": "operational"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/market/cache/warm")
async def warm_cache_manually():
    """Manually trigger cache warming for popular stocks"""
    try:
        await market_data_cache.warm_cache()
        return {
            "message": "Cache warming completed",
            "stocks_warmed": len(market_data_cache.snapshot_stocks[:10])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache warming failed: {str(e)}")

@router.post("/market/cache/invalidate")
async def invalidate_cache(cache_key: Optional[str] = None):
    """Invalidate specific cache key or all caches"""
    try:
        await market_data_cache.invalidate_cache(cache_key)
        return {
            "message": f"Cache {'key ' + cache_key if cache_key else 'all keys'} invalidated",
            "invalidated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {str(e)}")

@router.post("/market/cache/metrics/reset")
async def reset_cache_metrics():
    """Reset cache performance metrics"""
    try:
        market_data_cache.reset_cache_metrics()
        return {
            "message": "Cache metrics reset successfully",
            "reset_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/news")
async def get_market_news(category: str = "general"):
    """Get market news from Finnhub"""
    try:
        # Run in thread pool to avoid blocking
        news = await asyncio.to_thread(finnhub_service.get_market_news, category)
        return {"news": news}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

