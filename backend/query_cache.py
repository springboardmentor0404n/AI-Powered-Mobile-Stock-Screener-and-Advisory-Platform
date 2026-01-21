"""
Query Result Caching Layer

Provides intelligent caching for database queries with TTL management,
cache invalidation, and cache warming. Uses Redis.
"""

import hashlib
import json
from typing import Optional, Any, Callable, List
from datetime import datetime, timedelta
import logging
from redis_config import redis_manager

logger = logging.getLogger(__name__)


class QueryCache:
    """
    Intelligent query result caching with automatic invalidation and warming.
    Uses Redis as the caching layer.
    """
    
    def __init__(self):
        self.namespace = "query_cache"
        self.default_ttl = 300  # 5 minutes
        self.redis = redis_manager
        
        # Query-specific TTL configuration (seconds)
        self.ttl_config = {
            "market_snapshot": 60,           # 1 minute - real-time data
            "price_history": 300,            # 5 minutes - historical data
            "portfolio_summary": 60,         # 1 minute - user data
            "daily_aggregates": 3600,        # 1 hour - daily stats
            "user_activity": 600,            # 10 minutes - analytics
            "stock_fundamentals": 86400,     # 24 hours - company data
            "continuous_aggregate": 1800,    # 30 minutes - pre-computed data
        }
        
        # Track cache statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "invalidations": 0,
            "errors": 0,
        }
    
    def _generate_cache_key(self, query_type: str, params: dict) -> str:
        """
        Generate deterministic cache key from query type and parameters
        
        Args:
            query_type: Type of query (e.g., "price_history", "market_snapshot")
            params: Query parameters dictionary
            
        Returns:
            str: Cache key
        """
        # Sort params for consistent hashing
        param_str = json.dumps(params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()[:12]
        return f"{self.namespace}:{query_type}:{param_hash}"
    
    async def get(self, query_type: str, params: dict) -> Optional[Any]:
        """Get cached query result (Redis Only)"""
        try:
            cache_key = self._generate_cache_key(query_type, params)
            
            # 1. Try Redis
            if self.redis.is_connected:
                val = await self.redis.get(cache_key)
                if val:
                    self.stats["hits"] += 1
                    return json.loads(val)
            
            self.stats["misses"] += 1
            return None
                
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"[QUERY CACHE] Get error: {e}")
            return None
    
    async def set(self, query_type: str, params: dict, result: Any, ttl: Optional[int] = None) -> bool:
        """Cache query result (Redis Only)"""
        if not ttl:
            ttl = self.ttl_config.get(query_type, self.default_ttl)
            
        try:
            cache_key = self._generate_cache_key(query_type, params)
            val_str = json.dumps(result)
            
            # 1. Write to Redis
            if self.redis.is_connected:
                await self.redis.set(cache_key, val_str, ttl)
                self.stats["sets"] += 1
                return True
                
            return False
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"[QUERY CACHE] Set error: {e}")
            return False


    
    async def get_or_fetch(
        self,
        query_type: str,
        params: dict,
        fetch_fn: Callable,
        ttl: Optional[int] = None
    ) -> Any:
        """
        Get from cache or fetch from database if not cached
        
        Args:
            query_type: Type of query
            params: Query parameters
            fetch_fn: Async function to fetch data if not cached
            ttl: Optional TTL override
            
        Returns:
            Query result (from cache or fresh fetch)
        """
        # Try cache first
        cached_result = await self.get(query_type, params)
        if cached_result is not None:
            return cached_result
        
        # Cache miss - fetch from database
        try:
            result = await fetch_fn()
            
            # Cache the result
            if result is not None:
                await self.set(query_type, params, result, ttl)
            
            return result
            
        except Exception as e:
            logger.error(f"[QUERY CACHE] Fetch error: {e}")
            raise
    
    async def invalidate(self, query_type: Optional[str] = None, params: Optional[dict] = None) -> int:
        """
        Invalidate cached queries
        
        Args:
            query_type: Optional query type to invalidate (None = all queries)
            params: Optional specific params to invalidate (None = all params for query_type)
            
        Returns:
            int: Number of keys invalidated
        """
        # Redis-only invalidation
        try:
            if query_type and params:
                # Invalidate specific query
                cache_key = self._generate_cache_key(query_type, params)
                if self.redis.is_connected:
                     await self.redis.delete(cache_key)
                     count = 1
                else:
                    count = 0
            else:
                # Pattern deletion in Redis if needed, but for now assuming TTL handles bulk
                # Or implement a scan and delete strategy if required
                count = 0
            
            self.stats["invalidations"] += count
            logger.info(f"[QUERY CACHE] Invalidated {count} keys (type: {query_type or 'all'})")
            return count
            
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"[QUERY CACHE] Invalidation error: {e}")
            return 0
    
    async def warm_cache(self, warming_queries: List[dict]) -> dict:
        """
        Pre-populate cache with frequently accessed queries
        
        Args:
            warming_queries: List of dicts with 'query_type', 'params', and 'fetch_fn'
            
        Returns:
            dict: Warming statistics
        """
        warmed = 0
        failed = 0
        
        for query_config in warming_queries:
            try:
                query_type = query_config["query_type"]
                params = query_config["params"]
                fetch_fn = query_config["fetch_fn"]
                ttl = query_config.get("ttl")
                
                # Fetch and cache
                result = await fetch_fn()
                if result is not None:
                    success = await self.set(query_type, params, result, ttl)
                    if success:
                        warmed += 1
                    else:
                        failed += 1
                        
            except Exception as e:
                logger.error(f"[QUERY CACHE] Warming error: {e}")
                failed += 1
        
        logger.info(f"[QUERY CACHE] Warmed {warmed} queries, {failed} failed")
        return {
            "warmed": warmed,
            "failed": failed,
            "total": len(warming_queries)
        }
    
    def get_stats(self) -> dict:
        """
        Get cache statistics
        
        Returns:
            dict: Cache statistics
        """
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": round(hit_rate, 2),
            "sets": self.stats["sets"],
            "invalidations": self.stats["invalidations"],
            "errors": self.stats["errors"],
            "total_requests": total_requests,
        }
    
    def reset_stats(self):
        """Reset cache statistics"""
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "invalidations": 0,
            "errors": 0,
        }
        logger.info("[QUERY CACHE] Statistics reset")
    
    async def get_cache_size(self) -> dict:
        """
        Get cache size information
        
        Returns:
            dict: Cache size statistics
        """
        return {
            "info": "Values stored in Redis",
            "namespace": self.namespace,
            "ttl_config": self.ttl_config,
        }
    
    async def get_query_types(self) -> List[str]:
        """
        Get list of active query types in cache
        
        Returns:
            list: List of query types currently cached
        """
        # Not supported efficiently in SQL KV store without indexing on key patterns
        return []


# Global query cache instance
query_cache = QueryCache()
