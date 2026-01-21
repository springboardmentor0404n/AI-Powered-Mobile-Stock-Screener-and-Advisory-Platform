
import requests
import time
from datetime import datetime

try:
    response = requests.get("http://127.0.0.1:8000/api/market/news")
    data = response.json()
    
    print(f"Status Code: {response.status_code}")
    
    if "news" in data:
        news_items = data["news"]
        print(f"Total News Items: {len(news_items)}")
        
        count_8h = 0
        now = int(time.time())
        limit = now - (8 * 3600)
        
        print(f"Current Time: {now} ({datetime.fromtimestamp(now)})")
        print(f"8h Ago Limit: {limit} ({datetime.fromtimestamp(limit)})")
        
        for item in news_items[:5]:
            ts = item.get('datetime', 0)
            is_recent = ts > limit
            if is_recent:
                count_8h += 1
            print(f"- [{ts}] {datetime.fromtimestamp(ts)}: {item.get('headline')} (Recent: {is_recent})")
            
        print(f"\nTotal items within 8 hours: {count_8h}")
    else:
        print("No 'news' key in response")
        print(data)

except Exception as e:
    print(f"Error: {e}")
