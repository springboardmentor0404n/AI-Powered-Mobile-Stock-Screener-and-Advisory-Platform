import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Fallback for dev if no key
MOCK_RESPONSE = {
    "intent": "SCREENER",
    "criteria": [
        {"field": "pe_ratio", "operator": "<", "value": 50},
        {"field": "roe", "operator": ">", "value": 0.15}
    ]
}

SYSTEM_PROMPT = """
You are a financial query parser. Convert the user's natural language query into a JSON object.
Intent options: 'SCREENER', 'STOCK_DETAIL'.

Rules:
1. If the user mentions a specific stock name (e.g., "Reliance", "TCS", "Apple", "Infosys"), set intent to 'STOCK_DETAIL' and extract the likely symbol.
2. If the user asks for stocks matching criteria (e.g., "High PE", "Debt free", "Growth stocks"), set intent to 'SCREENER' and extract criteria.
3. Supported fields for screener: 'pe_ratio', 'roe', 'debt_to_equity', 'market_cap', 'current_price', 'sector', 'eps', 'div_yield', 'profit_growth', 'sales_growth', 'rsi', 'macd'.
4. Supported operators: '>', '<', '>=', '<=', '=', 'contains'.
5. CRITICAL: Convert percentages to decimals. If user asks for "ROE > 15", value should be 0.15. "sales growth > 10%" -> 0.10.

Output JSON structure:
For Stock Detail:
{
  "intent": "STOCK_DETAIL",
  "symbol": "RELIANCE" 
}
For Screener:
{
  "intent": "SCREENER",
  "criteria": [
    {"field": "pe_ratio", "operator": "<", "value": 15},
    {"field": "roe", "operator": ">", "value": 0.20}
  ]
}

Do not output markdown code blocks. Just the raw JSON string.
"""

async def parse_query(user_query: str):
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY not found. Using mock response.")
        # Simple mock logic for testing without key
        if "reliance" in user_query.lower():
             return {"intent": "STOCK_DETAIL", "symbol": "RELIANCE"}
        return MOCK_RESPONSE

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        print(f"🔮 Sending to LLM: {user_query}")
        response = await model.generate_content_async(f"{SYSTEM_PROMPT}\nUser Query: {user_query}")
        text = response.text.replace("```json", "").replace("```", "").strip()
        print(f"🤖 LLM Response: {text}")
        return json.loads(text)
    except Exception as e:
        print(f"LLM Error: {e}")
        print("Falling back to local parser due to error.")
        return local_parse_fallback(user_query)

def local_parse_fallback(user_query: str):
    """
    A dumb but robust fallback parser when LLM is down.
    Extracts sectors and common stock names.
    """
    q = user_query.lower()
    
    # Check for specific stock names (Top 50 approximation)
    stocks = {
        "reliance": "RELIANCE", "tcs": "TCS", "infosys": "INFY", "infy": "INFY",
        "hdfc": "HDFCBANK", "icici": "ICICIBANK", "sbi": "SBIN", "axis": "AXISBANK",
        "kotak": "KOTAKBANK", "itc": "ITC", "hul": "HINDUNILVR", "airtel": "BHARTIARTL",
        "l&t": "LT", "lt": "LT", "asian paint": "ASIANPAINT", "maruti": "MARUTI",
        "titan": "TITAN", "wipro": "WIPRO", "bajaj": "BAJFINANCE"
    }
    
    for name, symbol in stocks.items():
        if name in q:
            return {"intent": "STOCK_DETAIL", "symbol": symbol}

    # Check for Sectors
    sectors = {
        "bank": "Financial Services", "finance": "Financial Services",
        "it": "Technology", "tech": "Technology", "software": "Technology",
        "auto": "Consumer Cyclical", "car": "Consumer Cyclical",
        "energy": "Energy", "oil": "Energy",
        "pharma": "Healthcare", "drug": "Healthcare"
    }
    
    criteria = []
    
    for key, sector in sectors.items():
        if key in q:
            criteria.append({"field": "sector", "operator": "contains", "value": sector})
            
    # Check for keywords like "PE", "Growth"
    if "pe" in q and "low" in q:
         criteria.append({"field": "pe_ratio", "operator": "<", "value": 20})
    if "pe" in q and "high" in q:
         criteria.append({"field": "pe_ratio", "operator": ">", "value": 50})
    if "roe" in q and "high" in q:
         criteria.append({"field": "roe", "operator": ">", "value": 0.15})
         
    if criteria:
        return {"intent": "SCREENER", "criteria": criteria}
        

    # Default if nothing matches
    return MOCK_RESPONSE

PROS_CONS_PROMPT = """
You are a financial analyst. specific task: Analyze the provided stock data (Fundamentals + Technicals) and Recent News to generate a list of Pros and Cons.
Output valid JSON only.

Input Data:
Stock: {symbol} - {name}
Price: {price}
PE: {pe}
ROE: {roe}
Debt/Eq: {de}
RSI: {rsi}
Recent News Headlines:
{news_summary}

Rules:
1. "Pros": List 3-5 positive points (e.g., "Company is debt-free", "Strong sales growth", "Technically bullish").
2. "Cons": List 3-5 negative points (e.g., "Stock is trading at high PE", "Low promoter holding", "Negative news sentiment").
3. Keep points concise (max 10 words).
4. Return strict JSON format: {{ "pros": ["..."], "cons": ["..."] }}
"""

async def generate_pros_cons(stock_data: dict, news_list: list):
    if not GEMINI_API_KEY:
        return {
            "pros": ["Company has good ROE (Mock)", "Debt is manageable (Mock)"],
            "cons": ["Stock trading at high PE (Mock)", "Sales growth is slow (Mock)"]
        }

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Format News
        news_summary = "\n".join([f"- {n.headline}" for n in news_list[:5]])
        
        prompt = PROS_CONS_PROMPT.format(
            symbol=stock_data.get('symbol', 'Unknown'),
            name=stock_data.get('company_name', 'Unknown'),
            price=stock_data.get('current_price', 0),
            pe=stock_data.get('pe_ratio', 'N/A'),
            roe=stock_data.get('roe', 'N/A'),
            de=stock_data.get('debt_to_equity', 'N/A'),
            rsi=stock_data.get('rsi', 'N/A'),
            news_summary=news_summary or "No recent news."
        )
        
        print(f"🔮 Generating Pros/Cons for {stock_data.get('symbol')}...")
        response = await model.generate_content_async(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"LLM Error (Pros/Cons): {e}")
        return {
            "pros": ["Unable to generate thoughts (AI Error)"],
            "cons": ["Please check data manually"]
        }

