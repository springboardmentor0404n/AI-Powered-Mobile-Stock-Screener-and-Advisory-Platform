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
        {"field": "pe_ratio", "operator": "<", "value": 20},
        {"field": "roe", "operator": ">", "value": 15}
    ]
}

SYSTEM_PROMPT = """
You are a financial query parser. Convert the user's natural language query into a JSON object.
Intent options: 'SCREENER', 'STOCK_DETAIL'.

Rules:
1. If the user mentions a specific stock name (e.g., "Reliance", "TCS", "Apple", "Infosys"), set intent to 'STOCK_DETAIL' and extract the likely symbol.
2. If the user asks for stocks matching criteria (e.g., "High PE", "Debt free", "Growth stocks"), set intent to 'SCREENER' and extract criteria.
3. Supported fields for screener: 'pe_ratio', 'roe', 'debt_to_equity', 'market_cap', 'current_price', 'sector', 'eps', 'div_yield'.
4. Supported operators: '>', '<', '>=', '<=', '=', 'contains'.

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
    {"field": "pe_ratio", "operator": "<", "value": 15}
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
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(f"{SYSTEM_PROMPT}\nUser Query: {user_query}")
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"LLM Error: {e}")
        return {"error": "Failed to parse query"}
