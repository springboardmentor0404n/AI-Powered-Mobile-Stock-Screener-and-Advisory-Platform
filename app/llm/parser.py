import os, json, re
from google import genai

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# Expanded Intent Mapping to support directional sorting
# Expanded Intent Mapping to support directional sorting
INTENT_MAP = {
    "high_volume": ["high volume", "most traded", "active", "highest volume"],
    "low_volume": ["low volume", "least traded", "inactive", "lowest volume"], 
    "low_price": ["low price", "cheap", "below", "under", "less than", "low", "lowest", "bottom", "penny"],
    "high_price": ["high price", "expensive", "costly", "high", "highest", "top", "best", "above", "over", "more than", "higher than"],
    "high_performance": ["performing", "returns", "gainers"]
}

def parse_query(query: str) -> dict:
    q = query.lower().strip()
    filters = []
    
    # 1. Numerical Filter Detection (First pass to identify numbers used in filters)
    # Support currency symbols like ₹ or $
    price_match = re.search(r'(below|under|less than)\s*[₹$]?\s*(\d+)', q)
    above_match = re.search(r'(above|over|more than|higher than)\s*[₹$]?\s*(\d+)', q)
    filter_value = None
    
    if price_match:
        filter_value = float(price_match.group(2))
        filters.append({"field": "close", "operator": "<", "value": filter_value})
    elif above_match:
        filter_value = float(above_match.group(2))
        filters.append({"field": "close", "operator": ">", "value": filter_value})
    
    # 3. Intent Logic
    # Special handling: "top X" usually implies high price/performance if no other intent is found,
    # BUT if "low" or "cheapest" is present, that takes precedence.
    
    found_intents = []
    for k, v in INTENT_MAP.items():
        if any(s in q for s in v):
            found_intents.append(k)
    
    # Conflict resolution
    matched_intent = "general"
    if "low_price" in found_intents and "high_price" in found_intents:
        if "top" in q or "best" in q:
             matched_intent = "low_price"
        else:
             matched_intent = found_intents[0]
    elif found_intents:
        matched_intent = found_intents[0]

    # 2. Improved Digit Extraction & Limit Logic
    # We find all numbers, but exclude the one used in the filter if it exists
    numbers = [int(n) for n in re.findall(r'\b(\d+)\b', q)]
    
    if filter_value is not None:
        try:
             if int(filter_value) in numbers:
                 numbers.remove(int(filter_value))
        except ValueError:
            pass
            
    limit = numbers[0] if numbers else None
    
    # If no limit specified, check context:
    # If we have filters OR a specific intent (like high_volume), default to ALL (None).
    # If it's just general (e.g. "show me stocks"), keep it small (5).
    if limit is None:
        if filters or matched_intent != "general":
            limit = None
        else:
            limit = 5
        
    # Refine "general" if it matches "low" but wasn't caught (it should be caught by "low" in list now)
    
    # 4. Keyword Extraction (Simple Heuristic for Company Names)
    # We strip common words and return the rest as potential keywords.
    # In a real app, we would match against a symbols database.
    stopwords = {"show", "me", "volume", "price", "of", "stock", "stocks", "in", "is", "what", "high", "low", "value", "list", "all", "limit", "top", "bottom", "above", "below", "under", "over", "for"}
    words =  re.findall(r'\b[a-zA-Z]+\b', q)
    keywords = [w for w in words if w not in stopwords]

    return {
        "intent": matched_intent, 
        "filters": filters, 
        "limit": limit, 
        "quarters": 1 if "quarter" in q else None,
        "keywords": keywords
    }