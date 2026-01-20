import os, json, re
from google import genai

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# Expanded Intent Mapping to support directional sorting
INTENT_MAP = {
    "high_volume": ["high volume", "most traded", "active", "highest volume"],
    "low_volume": ["low volume", "least traded", "inactive", "lowest volume"], # ADDED THIS
    "low_price": ["low price", "cheap", "below", "under", "less than"],
    "high_price": ["high price", "expensive", "costly"],
    "high_performance": ["performing", "best", "returns", "gainers"]
}

def parse_query(query: str) -> dict:
    q = query.lower().strip()
    filters = []
    
    # 1. Improved Digit Extraction (Default to 5 for test sync)
    limit_match = re.search(r'\b(\d+)\b', q)
    limit = int(limit_match.group(1)) if limit_match else 5 
    
    # 2. Numerical Filter Detection
    price_match = re.search(r'(below|under|less than)\s*(\d+)', q)
    if price_match:
        filters.append({"field": "close", "operator": "<", "value": float(price_match.group(2))})
    
    # 3. Intent Logic
    intent = next((k for k, v in INTENT_MAP.items() if any(s in q for s in v)), "general")
    
    return {
        "intent": intent, 
        "filters": filters, 
        "limit": limit, 
        "quarters": 1 if "quarter" in q else None,
        "keywords": []
    }