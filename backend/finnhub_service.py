import os
import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class FinnhubService:
    def __init__(self):
        self.api_key = os.getenv("FINNHUB_API_KEY")
        self.base_url = "https://finnhub.io/api/v1"
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache for news
        self.last_news_id = 0
        self.last_check_time = datetime.now()
        
    def get_cached_news(self, category: str):
        if category in self._cache:
            data, timestamp = self._cache[category]
            if datetime.now() - timestamp < timedelta(seconds=self._cache_ttl):
                return data
        return None

    def set_cached_news(self, category: str, data: List[Dict]):
        self._cache[category] = (data, datetime.now())

    def get_market_news(self, category: str = "general") -> List[Dict]:
        """
        Get market news from Finnhub
        """
        cached = self.get_cached_news(category)
        if cached:
            return cached

        if not self.api_key:
            logger.error("Finnhub API key not found")
            return []
            
        try:
            url = f"{self.base_url}/news"
            params = {
                "category": category,
                "token": self.api_key
            }
            
            # Finnhub returns top global news by default.
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                news_data = response.json()
                
                # Keywords to filter for Indian market content
                india_keywords = [
                    "India", "Indian", "NSE", "BSE", "Nifty", "Sensex", "Rupee", "RBI", 
                    "Mumbai", "Delhi", "Adani", "Reliance", "Tata", "HDFC", "Infosys", 
                    "Wipro", "ICICI", "SBI", "GIFT City", "SEBI", "Mahindra", "Bajaj", 
                    "L&T", "Maruti", "Asian Paints", "Axis", "Kotak", "Sensex", "Nifty50"
                ]

                formatted_news = []
                # Process ALL returned items to find relevant ones (don't slice early)
                for item in news_data:
                    # Filter logic: Check if headline or summary contains keywords
                    content = f"{item.get('headline', '')} {item.get('summary', '')}"
                    
                    # If looking for 'general', apply India filter.
                    # If Finnhub returns very few India results, we might relax this or
                    # include top global stories that are very significant.
                    if any(keyword.lower() in content.lower() for keyword in india_keywords):
                        formatted_news.append({
                            "id": item.get("id"),
                            "headline": item.get("headline"),
                            "summary": item.get("summary"),
                            "source": item.get("source"),
                            "url": item.get("url"),
                            "image": item.get("image"),
                            "datetime": item.get("datetime")
                        })
                    
                    if len(formatted_news) >= 20: 
                        break
                
                # If we found very few Indian news, fill with some top global news 
                # because "Zerodha" also shows major global events (Fed, Tech earnings, etc.)
                if len(formatted_news) < 5:
                     for item in news_data:
                        # Avoid duplicates
                        if any(n['id'] == item.get('id') for n in formatted_news):
                            continue
                            
                        formatted_news.append({
                            "id": item.get("id"),
                            "headline": item.get("headline"),
                            "summary": item.get("summary"),
                            "source": item.get("source"),
                            "url": item.get("url"),
                            "image": item.get("image"),
                            "datetime": item.get("datetime")
                        })
                        if len(formatted_news) >= 10:
                            break
                
                # Update last seen ID for notification logic
                if formatted_news:
                    # Assuming IDs are increasing or distinct. 
                    # If ID is numeric, we can use max. If string, we might rely on the fact that API returns latest first.
                    try:
                        latest_id = formatted_news[0]['id']
                        if latest_id > self.last_news_id:
                            self.last_news_id = latest_id
                    except:
                        pass # IDs might be strings or non-comparable

                self.set_cached_news(category, formatted_news)
                return formatted_news
            else:
                logger.error(f"Finnhub API error: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching Finnhub news: {e}")
            return []

    def check_for_new_news(self) -> List[Dict]:
        """
        Check for news appearing after the last known ID.
        Returns a list of NEW news items to notify users about.
        """
        if not self.api_key:
            return []
            
        try:
            # We bypass cache usually, but to save quotas we can use a shorter variable cache
            # For simplicity, we just fetch from API but ensure we don't return old items
            
            # Fetch fresh news
            url = f"{self.base_url}/news"
            params = {"category": "general", "token": self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                return []
                
            news_data = response.json()
            new_items = []
            
            # Filter for India keywords again to only notify relevant stuff
            india_keywords = [
                "India", "Indian", "NSE", "BSE", "Nifty", "Sensex", "Rupee", "RBI", 
                "Mumbai", "Delhi", "Adani", "Reliance", "Tata", "HDFC", "Infosys", 
                "Wipro", "ICICI", "SBI", "GIFT City", "SEBI", "Mahindra", "Bajaj", 
                "L&T", "Maruti", "Asian Paints", "Axis", "Kotak"
            ]
            
            current_max_id = self.last_news_id
            
            # If it's the first run (last_news_id is 0), just update the ID and return nothing
            # so users don't get blasted with 20 notifications at startup
            if current_max_id == 0:
                if news_data:
                    self.last_news_id = news_data[0].get('id', 0)
                return []

            for item in news_data:
                item_id = item.get('id', 0)
                
                # If we reached old news, stop
                if item_id <= current_max_id:
                    break
                    
                # Check keywords
                content = f"{item.get('headline', '')} {item.get('summary', '')}"
                if any(keyword.lower() in content.lower() for keyword in india_keywords):
                    new_items.append({
                        "id": item_id,
                        "headline": item.get("headline"),
                        "source": item.get("source"),
                        "url": item.get("url"),
                        "datetime": item.get("datetime")
                    })
            
            # Update max ID if we found fresher news
            if news_data:
                latest_fetched = news_data[0].get('id', 0)
                if latest_fetched > self.last_news_id:
                    self.last_news_id = latest_fetched
                    
            return new_items
            
        except Exception:
            return []

finnhub_service = FinnhubService()
