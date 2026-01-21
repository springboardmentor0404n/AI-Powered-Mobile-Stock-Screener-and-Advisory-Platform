import os
from gemini_service import gemini_service
from dotenv import load_dotenv

load_dotenv()

def ai_search_query(query: str) -> str:
    """
    Use AI to interpret search query and return best stock symbol
    Returns symbol to search for, or original query if AI fails
    """
    if len(query) < 3:
        return query
    
    try:
        prompt = f"""You are a stock symbol assistant for Indian stocks (NSE/BSE).
        
Given a user query, return ONLY the most relevant stock symbol (ticker).

Rules:
1. For company names, return the NSE/BSE symbol (e.g., "Reliance" -> "RELIANCE").
2. For indices, return the index symbol (e.g., "Nifty 50" -> "NIFTY").
3. For sectors or categories, return the MARKET LEADER'S symbol (e.g., "IT stocks" -> "TCS", "Banks" -> "HDFCBANK").
4. Return ONLY the symbol (uppercase), nothing else.

Examples:
- "Infosys" → INFY
- "reliance industries" → RELIANCE
- "tata consultancy services" → TCS
- "IT stocks" → TCS
- "banking stocks" → HDFCBANK
- "top auto company" → TATAMOTORS

User query: "{query}"

Return ONLY the symbol."""

        response = gemini_service.chat(prompt)
        result = response.strip().upper()
        
        # Validate result (should be alphanumeric, max 20 chars)
        if result and result.replace(" ", "").isalnum() and len(result) <= 20:
            print(f"[AI SEARCH] '{query}' → '{result}'")
            return result
        else:
            print(f"[AI SEARCH] Invalid result: {result}")
            return query
            
    except Exception as e:
        print(f"[AI SEARCH ERROR] {e}")
        return query

def generate_stock_insight(symbol: str) -> dict:
    """
    Generate a 2-sentence market insight + sentiment for a stock.
    """
    try:
        prompt = f"""You are a financial analyst providing insights for Indian stock market.
        
Provide a brief, 2-sentence insight for the stock '{symbol}' (NSE/BSE).
Analyze the current market trend and provide actionable information.
Also classify the current trend as 'Bullish', 'Bearish', or 'Neutral'.

IMPORTANT: Return ONLY valid JSON with no additional text.

Format:
{{
  "sentiment": "Bullish",
  "insight": "Your 2 sentence insight here about {symbol}."
}}

Example for RELIANCE:
{{
  "sentiment": "Bullish",
  "insight": "Reliance Industries shows strong upward momentum with expanding profit margins across petrochemicals and retail segments. Technical indicators suggest continued positive trend in the near term."
}}

Now provide insight for {symbol}:"""

        print(f"[AI INSIGHT] Generating insight for {symbol}...")
        response = gemini_service.chat(prompt)
        print(f"[AI INSIGHT] Raw response: {response[:200]}...")
        
        # Clean response - remove markdown code blocks if present
        import json
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        # Remove disclaimer if present
        if "*(Disclaimer:" in cleaned_response:
            cleaned_response = cleaned_response.split("*(Disclaimer:")[0].strip()
        
        # Try to find JSON in the response
        json_start = cleaned_response.find('{')
        json_end = cleaned_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            cleaned_response = cleaned_response[json_start:json_end]
        
        print(f"[AI INSIGHT] Cleaned response: {cleaned_response[:200]}...")
        
        result = json.loads(cleaned_response)
        
        # Add color code based on sentiment
        sentiment = result.get("sentiment", "Neutral")
        if sentiment == "Bullish": 
            color = "#10B981"
        elif sentiment == "Bearish": 
            color = "#EF4444"
        else: 
            color = "#3B82F6"
        
        result["color"] = color
        
        print(f"[AI INSIGHT] ✅ Generated insight for {symbol}: {sentiment}")
        return result
        
    except json.JSONDecodeError as e:
        print(f"[AI INSIGHT ERROR] JSON parsing failed for {symbol}: {e}")
        print(f"[AI INSIGHT ERROR] Response was: {response if 'response' in locals() else 'No response'}")
        return {
            "sentiment": "Neutral", 
            "insight": f"Market analysis for {symbol} is currently processing. Technical indicators show mixed signals with moderate volatility.",
            "color": "#3B82F6"
        }
    except Exception as e:
        print(f"[AI INSIGHT ERROR] Failed to generate insight for {symbol}: {e}")
        import traceback
        traceback.print_exc()
        return {
            "sentiment": "Neutral", 
            "insight": f"Market data for {symbol} is being updated. Please check back in a moment for detailed analysis.",
            "color": "#9CA3AF"
        }
