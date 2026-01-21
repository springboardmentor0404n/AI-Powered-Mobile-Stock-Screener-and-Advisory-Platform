import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend directory first
backend_dir = Path(__file__).parent
env_path = backend_dir / '.env'
load_dotenv(env_path)

import asyncio
from typing import List, Dict
import re
from angelone_service import get_stock_eod, search_stocks
from yahoo_service import get_stock_fundamentals
from gemini_service import gemini_service
from query_validator import query_validator, QueryIntent, QueryAction

SYSTEM_PROMPT = """You are an expert Indian stock market advisor with deep knowledge of NSE and BSE stocks. 

Your role is to:
1. Provide detailed, actionable investment advice based on real market data
2. Analyze stocks using fundamental metrics (P/E ratio, market cap, revenue growth, debt levels)
3. Consider technical indicators and market trends
4. Give clear BUY, HOLD, or AVOID recommendations with reasoning
5. Mention key risks and opportunities for each stock
6. Compare stocks with their sector peers when relevant
7. Use markdown formatting for clarity (bold for emphasis, bullet points for key points)

When analyzing a stock:
- Start with your recommendation (BUY/HOLD/AVOID) and target price if applicable
- Explain the fundamentals (valuation, growth, profitability)
- Mention recent performance and trends
- Highlight key risks and catalysts
- Suggest entry/exit points for active traders

If asked about stocks from other exchanges (NYSE, NASDAQ, etc.), politely mention you specialize in Indian markets.

Be confident and specific in your advice. Avoid generic disclaimers - give real, data-driven recommendations like a professional advisor would.
"""

async def get_chat_response(history: List[Dict[str, str]], message: str) -> str:
    try:
        # Validate and normalize query first
        try:
            validated_query = query_validator.validate(message)
            print(f"[QUERY VALIDATION] Intent: {validated_query.intent}, Action: {validated_query.action}, Symbols: {validated_query.stock_symbols}, Confidence: {validated_query.confidence}")
            
            # Use normalized query for processing
            normalized_message = validated_query.normalized_query
            detected_symbols = validated_query.stock_symbols
        except Exception as e:
            print(f"[QUERY VALIDATION ERROR] {e}")
            # Fallback to original query if validation fails
            normalized_message = message
            detected_symbols = []
        
        # Check for symbol context in message
        market_context = ""
        match = re.search(r'\(([A-Z0-9]+\.[A-Z]+)\)', message)
        
        # Use detected symbols from validator if available
        if detected_symbols and not match:
            # Try to fetch data for first detected symbol
            for symbol in detected_symbols[:1]:  # Process first symbol
                try:
                    # Add -EQ suffix if not present and no exchange specified
                    if '.' not in symbol and '-' not in symbol:
                        symbol = f"{symbol}-EQ"
                    
                    print(f"[DEBUG] Processing validated symbol: {symbol}")
                    
                    # Get comprehensive data
                    stock_data = await asyncio.to_thread(get_stock_eod, symbol)
                    fundamentals = await get_stock_fundamentals(symbol.split('.')[0].split('-')[0])  # Clean symbol
                    
                    if stock_data or fundamentals:
                        print(f"[DEBUG] Data found for {symbol}")
                        market_context = f"\n\n[COMPREHENSIVE MARKET DATA for {symbol}]:\n"
                        
                        if stock_data:
                            market_context += f"**Price Data:**\n"
                            market_context += f"- Current Price: ₹{stock_data.get('close')}\n"
                            market_context += f"- Open: ₹{stock_data.get('open')}\n"
                            market_context += f"- High: ₹{stock_data.get('high')}\n"
                            market_context += f"- Low: ₹{stock_data.get('low')}\n"
                            market_context += f"- Volume: {stock_data.get('volume')}\n"
                            market_context += f"- Date: {stock_data.get('date')}\n\n"
                        
                        if fundamentals:
                            market_context += f"**Fundamental Data:**\n"
                            market_context += f"- Company: {fundamentals.get('company_name', 'N/A')}\n"
                            market_context += f"- Sector: {fundamentals.get('sector', 'N/A')}\n"
                            market_context += f"- Industry: {fundamentals.get('industry', 'N/A')}\n"
                            market_context += f"- Market Cap: ₹{fundamentals.get('market_cap', 0):,.0f}\n"
                            market_context += f"- P/E Ratio: {fundamentals.get('pe_ratio', 'N/A')}\n"
                            market_context += f"- P/B Ratio: {fundamentals.get('pb_ratio', 'N/A')}\n"
                            market_context += f"- Dividend Yield: {fundamentals.get('dividend_yield', 0)*100:.2f}%\n"
                            market_context += f"- Beta: {fundamentals.get('beta', 'N/A')}\n"
                            market_context += f"- 52 Week High: ₹{fundamentals.get('52_week_high', 'N/A')}\n"
                            market_context += f"- 52 Week Low: ₹{fundamentals.get('52_week_low', 'N/A')}\n"
                            market_context += f"- Current Price: ₹{fundamentals.get('current_price', 0)}\n"
                            market_context += f"- Price Change: ₹{fundamentals.get('change', 0):.2f} ({fundamentals.get('change_percent', 0):.2f}%)\n\n"
                        
                        market_context += "Analyze this data thoroughly and provide a detailed investment recommendation."
                        break  # Found data, stop searching
                except Exception as sym_error:
                    print(f"[DEBUG] Error processing symbol {symbol}: {sym_error}")
                    continue
        
        # Original symbol extraction logic as fallback
        if not market_context and match:
            symbol = match.group(1)
            print(f"[DEBUG] Extracted symbol: {symbol}")
            
            # Get comprehensive data
            stock_data = await asyncio.to_thread(get_stock_eod, symbol)
            fundamentals = await get_stock_fundamentals(symbol.split('.')[0])  # Remove exchange suffix
            
            if stock_data or fundamentals:
                print(f"[DEBUG] Data found for {symbol}")
                market_context = f"\n\n[COMPREHENSIVE MARKET DATA for {symbol}]:\n"
                
                if stock_data:
                    market_context += f"**Price Data:**\n"
                    market_context += f"- Current Price: ₹{stock_data.get('close')}\n"
                    market_context += f"- Open: ₹{stock_data.get('open')}\n"
                    market_context += f"- High: ₹{stock_data.get('high')}\n"
                    market_context += f"- Low: ₹{stock_data.get('low')}\n"
                    market_context += f"- Volume: {stock_data.get('volume')}\n"
                    market_context += f"- Date: {stock_data.get('date')}\n\n"
                
                if fundamentals:
                    market_context += f"**Fundamental Data:**\n"
                    market_context += f"- Company: {fundamentals.get('company_name', 'N/A')}\n"
                    market_context += f"- Sector: {fundamentals.get('sector', 'N/A')}\n"
                    market_context += f"- Industry: {fundamentals.get('industry', 'N/A')}\n"
                    market_context += f"- Market Cap: ₹{fundamentals.get('market_cap', 0):,.0f}\n"
                    market_context += f"- P/E Ratio: {fundamentals.get('pe_ratio', 'N/A')}\n"
                    market_context += f"- P/B Ratio: {fundamentals.get('pb_ratio', 'N/A')}\n"
                    market_context += f"- Dividend Yield: {fundamentals.get('dividend_yield', 0)*100:.2f}%\n"
                    market_context += f"- Beta: {fundamentals.get('beta', 'N/A')}\n"
                    market_context += f"- 52 Week High: ₹{fundamentals.get('52_week_high', 'N/A')}\n"
                    market_context += f"- 52 Week Low: ₹{fundamentals.get('52_week_low', 'N/A')}\n"
                    market_context += f"- Current Price: ₹{fundamentals.get('current_price', 0)}\n"
                    market_context += f"- Price Change: ₹{fundamentals.get('change', 0):.2f} ({fundamentals.get('change_percent', 0):.2f}%)\n\n"
                
                market_context += "Analyze this data thoroughly and provide a detailed investment recommendation."
            else:
                 print(f"[DEBUG] No data found for {symbol}")
        else:
             # Only search for stocks if message seems stock-related
             stock_keywords = ['stock', 'share', 'price', 'buy', 'sell', 'invest', 'market', 'trading', 'nse', 'bse', 'nifty', 'sensex', 'should i']
             message_lower = message.lower()
             
             # Check if message contains stock-related keywords or looks like a company/ticker name
             is_stock_query = (
                 any(keyword in message_lower for keyword in stock_keywords) or
                 (len(message.split()) <= 3 and len(message) > 2 and not any(greeting in message_lower for greeting in ['hi', 'hello', 'hey', 'thanks', 'thank you', 'bye', 'ok', 'okay']))
             )
             
             if is_stock_query and len(message) < 100:
                 print(f"[CHAT] Analyzing message for stock search: {message}")
                 
                 # Extract potential stock name - try to get capitalized words or specific patterns
                 # For "Should I buy Reliance?" -> extract "Reliance"
                 words = message.split()
                 potential_stock = None
                 
                 # Look for capitalized words that might be stock names
                 for word in words:
                     # Remove punctuation and check if it's likely a stock name
                     clean_word = word.strip('?.,!;:')
                     if clean_word and (clean_word[0].isupper() or clean_word.isupper()) and clean_word.lower() not in ['i', 'should', 'buy', 'sell', 'is', 'the', 'a', 'an', 'about', 'tell', 'me']:
                         potential_stock = clean_word
                         break
                 
                 # If we found a potential stock name, search for it specifically
                 search_term = potential_stock if potential_stock else message
                 print(f"[CHAT] Searching for: {search_term}")
                 
                 results = await search_stocks(search_term, use_ai=False)
                 if results:
                     top_match = results[0]
                     symbol = top_match['symbol']
                     name = top_match['name']
                     exchange = top_match.get('exchange', 'NSE')
                     print(f"[DEBUG] Found potential match: {name} ({symbol})")
                     
                     # Get comprehensive data
                     stock_data = await asyncio.to_thread(get_stock_eod, symbol)
                     fundamentals = await get_stock_fundamentals(symbol)
                     
                     if stock_data or fundamentals:
                        print(f"[DEBUG] Data found for {symbol}")
                        market_context = f"\n\n[COMPREHENSIVE MARKET DATA for {name} ({symbol})]:\n"
                        
                        if stock_data:
                            market_context += f"**Price Data:**\n"
                            market_context += f"- Current Price: ₹{stock_data.get('close')}\n"
                            market_context += f"- Open: ₹{stock_data.get('open')}\n"
                            market_context += f"- High: ₹{stock_data.get('high')}\n"
                            market_context += f"- Low: ₹{stock_data.get('low')}\n"
                            market_context += f"- Volume: {stock_data.get('volume')}\n"
                            market_context += f"- Date: {stock_data.get('date')}\n\n"
                        
                        if fundamentals:
                            market_context += f"**Fundamental Data:**\n"
                            market_context += f"- Company: {fundamentals.get('company_name', 'N/A')}\n"
                            market_context += f"- Sector: {fundamentals.get('sector', 'N/A')}\n"
                            market_context += f"- Industry: {fundamentals.get('industry', 'N/A')}\n"
                            market_context += f"- Market Cap: ₹{fundamentals.get('market_cap', 0):,.0f}\n"
                            market_context += f"- P/E Ratio: {fundamentals.get('pe_ratio', 'N/A')}\n"
                            market_context += f"- P/B Ratio: {fundamentals.get('pb_ratio', 'N/A')}\n"
                            market_context += f"- Dividend Yield: {fundamentals.get('dividend_yield', 0)*100:.2f}%\n"
                            market_context += f"- Beta: {fundamentals.get('beta', 'N/A')}\n"
                            market_context += f"- 52 Week High: ₹{fundamentals.get('52_week_high', 'N/A')}\n"
                            market_context += f"- 52 Week Low: ₹{fundamentals.get('52_week_low', 'N/A')}\n"
                            market_context += f"- Current Price: ₹{fundamentals.get('current_price', 0)}\n"
                            market_context += f"- Price Change: ₹{fundamentals.get('change', 0):.2f} ({fundamentals.get('change_percent', 0):.2f}%)\n\n"
                        
                        market_context += "Analyze this data thoroughly and provide a detailed investment recommendation."


        # Convert history format for free AI (OpenAI format)
        messages = []
        
        # Add system message
        messages.append({
            "role": "system",
            "content": SYSTEM_PROMPT
        })
        
        # Add chat history
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "assistant"
                parts = msg.get("parts", [])
                text_part = ""
                if isinstance(parts, list) and len(parts) > 0:
                    text_part = parts[0]
                elif isinstance(parts, str):
                    text_part = parts
                
                if text_part:
                    messages.append({"role": role, "content": text_part})
        
        # Add current message with context
        full_prompt = f"{market_context}\n\nUser Question: {message}"
        messages.append({"role": "user", "content": full_prompt})
        
        # Generate response using free AI
        response = gemini_service.chat_with_history(messages)
        return response
        
    except Exception as e:
        import traceback
        print(f"[ERROR TRACEBACK] {traceback.format_exc()}")
        return "I'm sorry, I encountered an error processing your request."
