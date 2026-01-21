from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import json
from gemini_service import gemini_service
from yahoo_service import get_stock_fundamentals, get_yahoo_history
from angelone_service import search_stocks
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/screener", tags=["screener"])

class ScreenerQuery(BaseModel):
    query: str

@router.post("/")
async def screen_stocks(query: ScreenerQuery):
    """
    AI-Powered Stock Screener
    1. Interpret user query using Free AI
    2. Fetch real stock data with prices and percentages
    3. Return structured results
    """
    
    try:
        # 1. Use AI to interpret query and suggest stocks
        prompt = f"""Analyze this stock market query and suggest relevant Indian stocks.
Query: {query.query}

Return ONLY a JSON object with this format:
{{
    "stocks": ["RELIANCE", "TCS", "INFY"],
    "intent": "sector_analysis",
    "criteria": "IT sector stocks"
}}

Suggest 5-10 relevant NSE stocks based on the query."""
        
        response = gemini_service.chat(prompt)
        
        try:
            parsed = json.loads(response)
        except:
            # Fallback if AI doesn't return valid JSON
            parsed = {"stocks": ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"], "intent": "general", "criteria": query.query}
        
        symbols = parsed.get("stocks", [])
        
        results = []
        
        # 2. Fetch real stock data with proper price calculations
        for sym in symbols[:10]:  # Limit to 10 stocks
            # Normalize symbol
            clean_sym = sym.replace(".NS", "").replace(".NSE", "").replace(".BSE", "").replace(".BO", "")
            
            try:
                # Get Fundamentals with real prices
                fund = await get_stock_fundamentals(clean_sym)
                
                if fund and fund.get("current_price"):
                    results.append({
                        "symbol": clean_sym,
                        "company": fund.get("company_name", clean_sym),
                        "price": fund.get("current_price", 0),
                        "change": fund.get("change", 0),
                        "changePercent": fund.get("change_percent", 0),
                        "pe_ratio": fund.get("pe_ratio", 0),
                        "market_cap": fund.get("market_cap", 0),
                        "sector": fund.get("sector", "Unknown"),
                        "exchange": "NSE"
                    })
            except Exception as item_error:
                print(f"[SCREENER] Error fetching {clean_sym}: {item_error}")
                continue

        # 3. Generate AI summary
        if results:
            summary_prompt = f"""Based on these stocks, answer the user's question: "{query.query}"

Stock Data:
{json.dumps(results, indent=2)}

Provide a 2-3 sentence analysis."""
            
            try:
                answer = gemini_service.chat(summary_prompt)
            except:
                answer = f"Found {len(results)} stocks matching your criteria."
        else:
            answer = f"No stocks found matching: {query.query}"

        return {
            "stocks": results,
            "intent": parsed.get("intent", "general"),
            "criteria": parsed.get("criteria", query.query),
            "summary": answer
        }

    except Exception as e:
        print(f"[SCREENER ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {
            "stocks": [],
            "intent": "error",
            "criteria": query.query,
            "summary": f"Error processing query: {str(e)}"
        }
