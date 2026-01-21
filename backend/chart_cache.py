"""
Chart Cache Service - Aggressive caching and background updates for chart data
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import time

class ChartCacheService:
    def __init__(self):
        # Multi-level cache: symbol -> interval -> data
        self._cache: Dict[str, Dict[str, dict]] = {}
        self._cache_timestamps: Dict[str, Dict[str, float]] = {}
        
        # Background update tasks
        self._update_tasks: Dict[str, asyncio.Task] = {}
        
        # Cache TTLs (in seconds)
        self.ttl_config = {
            "1m": 60,      # 1 minute
            "5m": 300,     # 5 minutes
            "15m": 900,    # 15 minutes
            "30m": 1800,   # 30 minutes
            "1h": 3600,    # 1 hour
            "1d": 86400,   # 24 hours
            "1w": 604800,  # 7 days
        }
        
        # Preload popular stocks
        self.popular_stocks = [
            "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
            "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK"
        ]
        
        # Track active charts for background updates
        self._active_charts: Dict[str, set] = {}  # symbol -> set of intervals
        
    def _get_cache_key(self, symbol: str, interval: str) -> str:
        """Generate cache key"""
        return f"{symbol}:{interval}"
    
    def get_cached_chart(self, symbol: str, interval: str) -> Optional[List[dict]]:
        """Get cached chart data if valid"""
        cache_key = self._get_cache_key(symbol, interval)
        
        if symbol not in self._cache or interval not in self._cache[symbol]:
            return None
        
        # Check if cache is still valid
        if symbol in self._cache_timestamps and interval in self._cache_timestamps[symbol]:
            cache_time = self._cache_timestamps[symbol][interval]
            ttl = self.ttl_config.get(interval, 300)
            
            if time.time() - cache_time < ttl:
                print(f"[CHART_CACHE] HIT: {cache_key}")
                return self._cache[symbol][interval]
            else:
                print(f"[CHART_CACHE] EXPIRED: {cache_key}")
        
        return None
    
    def set_cached_chart(self, symbol: str, interval: str, data: List[dict]):
        """Cache chart data"""
        if symbol not in self._cache:
            self._cache[symbol] = {}
            self._cache_timestamps[symbol] = {}
        
        self._cache[symbol][interval] = data
        self._cache_timestamps[symbol][interval] = time.time()
        
        cache_key = self._get_cache_key(symbol, interval)
        print(f"[CHART_CACHE] SET: {cache_key} ({len(data)} candles)")
    
    async def start_background_updates(self, symbol: str, interval: str, fetch_func):
        """Start background updates for an active chart"""
        cache_key = self._get_cache_key(symbol, interval)
        
        # Mark as active
        if symbol not in self._active_charts:
            self._active_charts[symbol] = set()
        self._active_charts[symbol].add(interval)
        
        # Cancel existing task if any
        if cache_key in self._update_tasks:
            self._update_tasks[cache_key].cancel()
        
        # Start new background update task
        task = asyncio.create_task(
            self._background_update_loop(symbol, interval, fetch_func)
        )
        self._update_tasks[cache_key] = task
        
        print(f"[CHART_CACHE] Started background updates for {cache_key}")
    
    async def _background_update_loop(self, symbol: str, interval: str, fetch_func):
        """Background loop to update chart data"""
        cache_key = self._get_cache_key(symbol, interval)
        update_interval = self.ttl_config.get(interval, 300) // 2  # Update at half TTL
        
        try:
            while True:
                await asyncio.sleep(update_interval)
                
                # Check if still active
                if symbol not in self._active_charts or interval not in self._active_charts[symbol]:
                    print(f"[CHART_CACHE] Stopping updates for inactive {cache_key}")
                    break
                
                # Fetch fresh data
                try:
                    print(f"[CHART_CACHE] Background update for {cache_key}")
                    data = await fetch_func(symbol, interval)
                    if data:
                        self.set_cached_chart(symbol, interval, data)
                except Exception as e:
                    print(f"[CHART_CACHE] Background update failed for {cache_key}: {e}")
        
        except asyncio.CancelledError:
            print(f"[CHART_CACHE] Background task cancelled for {cache_key}")
        finally:
            # Cleanup
            if cache_key in self._update_tasks:
                del self._update_tasks[cache_key]
    
    def stop_background_updates(self, symbol: str, interval: str):
        """Stop background updates when user exits chart"""
        cache_key = self._get_cache_key(symbol, interval)
        
        # Mark as inactive
        if symbol in self._active_charts and interval in self._active_charts[symbol]:
            self._active_charts[symbol].discard(interval)
            if not self._active_charts[symbol]:
                del self._active_charts[symbol]
        
        # Cancel task
        if cache_key in self._update_tasks:
            self._update_tasks[cache_key].cancel()
            del self._update_tasks[cache_key]
        
        print(f"[CHART_CACHE] Stopped background updates for {cache_key}")
    
    async def preload_popular_charts(self, fetch_func):
        """Preload charts for popular stocks"""
        print("[CHART_CACHE] Preloading popular charts...")
        
        tasks = []
        for symbol in self.popular_stocks[:5]:  # Top 5 only
            for interval in ["1d", "1h"]:  # Most common intervals
                tasks.append(self._preload_chart(symbol, interval, fetch_func))
        
        await asyncio.gather(*tasks, return_exceptions=True)
        print("[CHART_CACHE] Preload complete")
    
    async def _preload_chart(self, symbol: str, interval: str, fetch_func):
        """Preload a single chart"""
        try:
            data = await fetch_func(symbol, interval)
            if data:
                self.set_cached_chart(symbol, interval, data)
        except Exception as e:
            print(f"[CHART_CACHE] Preload failed for {symbol} {interval}: {e}")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        total_cached = sum(len(intervals) for intervals in self._cache.values())
        active_updates = len(self._update_tasks)
        
        return {
            "total_cached_charts": total_cached,
            "active_background_updates": active_updates,
            "cached_symbols": list(self._cache.keys()),
            "active_charts": {
                symbol: list(intervals) 
                for symbol, intervals in self._active_charts.items()
            }
        }
    
    def clear_cache(self, symbol: Optional[str] = None):
        """Clear cache for a symbol or all"""
        if symbol:
            if symbol in self._cache:
                del self._cache[symbol]
            if symbol in self._cache_timestamps:
                del self._cache_timestamps[symbol]
            print(f"[CHART_CACHE] Cleared cache for {symbol}")
        else:
            self._cache.clear()
            self._cache_timestamps.clear()
            print("[CHART_CACHE] Cleared all cache")

# Global instance
chart_cache = ChartCacheService()
