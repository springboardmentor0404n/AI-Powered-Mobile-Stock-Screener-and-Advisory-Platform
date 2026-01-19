import os
import requests
import logging
import re
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Yahoo Finance API (free, no key required)
YAHOO_FINANCE_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

# Cache for API responses (to avoid hitting rate limits)
_api_cache = {}
_cache_expiry = {}

def get_live_stock_quote(symbol: str) -> dict:
    """
    Get live stock quote from Yahoo Finance API.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE.NS', 'TCS.NS' for NSE)
    
    Returns:
        Dictionary with live stock data or None if not found
    """
    import time
    
    # Check cache (valid for 1 minute for more real-time data)
    cache_key = f"quote_{symbol}"
    if cache_key in _api_cache:
        if time.time() - _cache_expiry.get(cache_key, 0) < 60:
            logger.info(f"Returning cached quote for {symbol}")
            return _api_cache[cache_key]
    
    try:
        # For Indian stocks, append .NS (NSE) or .BO (BSE)
        api_symbol = symbol.upper()
        if not any(api_symbol.endswith(ext) for ext in ['.NS', '.BO', '.NYSE', '.NASDAQ']):
            api_symbol = f"{api_symbol}.NS"  # Default to NSE for Indian stocks
        
        url = f"{YAHOO_FINANCE_BASE_URL}/{api_symbol}"
        params = {
            "interval": "1d",
            "range": "1d"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        logger.info(f"Fetching live quote for {api_symbol} from Yahoo Finance")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
                result_data = data["chart"]["result"][0]
                meta = result_data.get("meta", {})
                
                current_price = meta.get("regularMarketPrice", 0)
                previous_close = meta.get("previousClose", meta.get("chartPreviousClose", 0))
                
                if current_price > 0:
                    change = current_price - previous_close if previous_close else 0
                    change_percent = (change / previous_close * 100) if previous_close else 0
                    
                    result = {
                        "symbol": symbol.upper(),
                        "price": float(current_price),
                        "open": float(meta.get("regularMarketOpen", meta.get("open", 0))),
                        "high": float(meta.get("regularMarketDayHigh", meta.get("dayHigh", 0))),
                        "low": float(meta.get("regularMarketDayLow", meta.get("dayLow", 0))),
                        "volume": int(meta.get("regularMarketVolume", 0)),
                        "previous_close": float(previous_close),
                        "change": float(change),
                        "change_percent": f"{change_percent:+.2f}%",
                        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Cache the result
                    _api_cache[cache_key] = result
                    _cache_expiry[cache_key] = time.time()
                    
                    logger.info(f"Got live quote for {symbol}: ₹{result['price']}")
                    return result
            
            logger.warning(f"No quote data found for {symbol}")
            # Try with .BO suffix if .NS didn't work
            if api_symbol.endswith('.NS'):
                return get_live_stock_quote(symbol.replace('.NS', '.BO'))
            return None
        else:
            logger.error(f"Yahoo Finance API error: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching live quote: {e}")
        return None


def get_intraday_data(symbol: str, interval: str = "5m") -> list:
    """
    Get intraday/candle data from Yahoo Finance.
    
    Args:
        symbol: Stock symbol
        interval: Time interval (1m, 5m, 15m, 30m, 1h, 1d)
    
    Returns:
        List of price data points
    """
    import time
    
    cache_key = f"intraday_{symbol}_{interval}"
    if cache_key in _api_cache:
        if time.time() - _cache_expiry.get(cache_key, 0) < 300:
            return _api_cache[cache_key]
    
    try:
        api_symbol = symbol.upper()
        if not any(api_symbol.endswith(ext) for ext in ['.NS', '.BO']):
            api_symbol = f"{api_symbol}.NS"
        
        url = f"{YAHOO_FINANCE_BASE_URL}/{api_symbol}"
        params = {
            "interval": interval,
            "range": "1d"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
                result_data = data["chart"]["result"][0]
                timestamps = result_data.get("timestamp", [])
                indicators = result_data.get("indicators", {})
                quote = indicators.get("quote", [{}])[0]
                
                opens = quote.get("open", [])
                highs = quote.get("high", [])
                lows = quote.get("low", [])
                closes = quote.get("close", [])
                volumes = quote.get("volume", [])
                
                result = []
                for i in range(min(20, len(timestamps))):
                    if timestamps[i] and closes[i]:
                        result.append({
                            "timestamp": datetime.fromtimestamp(timestamps[i]).strftime("%Y-%m-%d %H:%M:%S"),
                            "open": float(opens[i]) if opens[i] else 0,
                            "high": float(highs[i]) if highs[i] else 0,
                            "low": float(lows[i]) if lows[i] else 0,
                            "close": float(closes[i]) if closes[i] else 0,
                            "volume": int(volumes[i]) if volumes and volumes[i] else 0
                        })
                
                _api_cache[cache_key] = result
                _cache_expiry[cache_key] = time.time()
                return result
        
        return []
        
    except Exception as e:
        logger.error(f"Error fetching intraday data: {e}")
        return []


def search_stock_data(query: str) -> list:
    """
    Search for stocks matching the query using local CSV data.
    
    Args:
        query: Search query (company name or symbol)
    
    Returns:
        List of matching stock records
    """
    try:
        from services.stock_service import screener, get_company
        
        query = query.upper().strip()
        
        # First try exact symbol match
        company = get_company(query)
        if company:
            return [company]
        
        # Get all stocks and search
        all_stocks = screener()
        if not all_stocks:
            return []
        
        # Search by symbol or partial match
        matches = []
        for stock in all_stocks:
            symbol = stock.get('symbol', '').upper()
            if query in symbol or symbol in query:
                matches.append(stock)
        
        return matches[:5]  # Return top 5 matches
        
    except Exception as e:
        logger.error(f"Error searching stock data: {e}")
        return []


def get_market_overview() -> dict:
    """
    Get a market overview from local data.
    
    Returns:
        Dictionary with top gainers, losers, and market summary
    """
    try:
        from services.stock_service import screener
        
        all_stocks = screener()
        if not all_stocks:
            return {"error": "No stock data available"}
        
        # Calculate gainers and losers based on change percentage
        stocks_with_change = []
        for stock in all_stocks:
            change = stock.get('pChange', stock.get('change_percent', 0))
            if change is not None:
                try:
                    change_val = float(str(change).replace('%', ''))
                    stock['change_numeric'] = change_val
                    stocks_with_change.append(stock)
                except:
                    pass
        
        if stocks_with_change:
            sorted_stocks = sorted(stocks_with_change, key=lambda x: x.get('change_numeric', 0), reverse=True)
            top_gainers = sorted_stocks[:5]
            top_losers = sorted_stocks[-5:][::-1]
        else:
            top_gainers = []
            top_losers = []
        
        return {
            "total_stocks": len(all_stocks),
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        logger.error(f"Error getting market overview: {e}")
        return {"error": str(e)}


def extract_stock_symbol(query: str) -> str:
    """
    Extract stock symbol from user query.
    
    Args:
        query: User query string
    
    Returns:
        Extracted symbol or None
    """
    # Common Indian stock names and their symbols
    stock_mapping = {
        'reliance': 'RELIANCE',
        'tcs': 'TCS',
        'infosys': 'INFY',
        'infy': 'INFY',
        'hdfc': 'HDFCBANK',
        'hdfc bank': 'HDFCBANK',
        'icici': 'ICICIBANK',
        'icici bank': 'ICICIBANK',
        'sbi': 'SBIN',
        'state bank': 'SBIN',
        'wipro': 'WIPRO',
        'bharti': 'BHARTIARTL',
        'airtel': 'BHARTIARTL',
        'itc': 'ITC',
        'kotak': 'KOTAKBANK',
        'axis': 'AXISBANK',
        'axis bank': 'AXISBANK',
        'maruti': 'MARUTI',
        'asian paints': 'ASIANPAINT',
        'hindustan unilever': 'HINDUNILVR',
        'hul': 'HINDUNILVR',
        'bajaj': 'BAJFINANCE',
        'bajaj finance': 'BAJFINANCE',
        'sun pharma': 'SUNPHARMA',
        'titan': 'TITAN',
        'nestle': 'NESTLEIND',
        'ultratech': 'ULTRACEMCO',
        'power grid': 'POWERGRID',
        'ntpc': 'NTPC',
        'ongc': 'ONGC',
        'coal india': 'COALINDIA',
        'tata motors': 'TATAMOTORS',
        'tata steel': 'TATASTEEL',
        'jswsteel': 'JSWSTEEL',
        'jsw steel': 'JSWSTEEL',
        'tech mahindra': 'TECHM',
        'hcl tech': 'HCLTECH',
        'adani': 'ADANIENT',
        'adani enterprises': 'ADANIENT',
        'adani ports': 'ADANIPORTS',
        'larsen': 'LT',
        'l&t': 'LT',
        'britannia': 'BRITANNIA',
        'cipla': 'CIPLA',
        'dr reddy': 'DRREDDY',
        'divis': 'DIVISLAB',
        'eicher': 'EICHERMOT',
        'grasim': 'GRASIM',
        'hero': 'HEROMOTOCO',
        'hindalco': 'HINDALCO',
        'indusind': 'INDUSINDBK',
        'm&m': 'M&M',
        'mahindra': 'M&M',
        'shree cement': 'SHREECEM',
        'upl': 'UPL'
    }
    
    query_lower = query.lower()
    
    # Check for known company names
    for name, symbol in stock_mapping.items():
        if name in query_lower:
            return symbol
    
    # Try to find uppercase words that might be symbols
    words = query.upper().split()
    for word in words:
        # Remove punctuation
        clean_word = re.sub(r'[^\w&]', '', word)
        if len(clean_word) >= 2 and clean_word.isalpha():
            # Check if it looks like a stock symbol
            if clean_word in ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 
                             'WIPRO', 'ITC', 'KOTAKBANK', 'AXISBANK', 'MARUTI', 'TITAN',
                             'BHARTIARTL', 'ASIANPAINT', 'HINDUNILVR', 'BAJFINANCE', 'LT',
                             'SUNPHARMA', 'NESTLEIND', 'ULTRACEMCO', 'POWERGRID', 'NTPC',
                             'ONGC', 'COALINDIA', 'TATAMOTORS', 'TATASTEEL', 'TECHM', 'HCLTECH']:
                return clean_word
    
    return None


def chat(query: str) -> str:
    """
    Process a chat query using live market data and AI.
    
    Args:
        query: User's question about stocks
        
    Returns:
        AI-generated response based on live and local stock data
    """
    try:
        logger.info(f"Processing chat query: {query}")
        
        # Handle greetings
        greetings = ['hi', 'hello', 'hey', 'hii', 'hiii', 'good morning', 'good afternoon', 
                     'good evening', 'howdy', 'whats up', "what's up", 'sup']
        query_lower = query.lower().strip()
        
        if query_lower in greetings or any(query_lower.startswith(g) for g in greetings):
            return generate_ai_response(query, None, is_greeting=True)
        
        # Determine query type and gather context
        context = ""
        
        # Check if asking about a specific stock
        symbol = extract_stock_symbol(query)
        
        if symbol:
            # Try to get live data first
            live_quote = get_live_stock_quote(symbol)
            
            if live_quote and live_quote['price'] > 0:
                context += f"\n📊 LIVE DATA for {symbol}:\n"
                context += f"  • Current Price: ₹{live_quote['price']:.2f}\n"
                context += f"  • Open: ₹{live_quote['open']:.2f}\n"
                context += f"  • High: ₹{live_quote['high']:.2f}\n"
                context += f"  • Low: ₹{live_quote['low']:.2f}\n"
                context += f"  • Previous Close: ₹{live_quote['previous_close']:.2f}\n"
                context += f"  • Change: ₹{live_quote['change']:.2f} ({live_quote['change_percent']})\n"
                context += f"  • Volume: {live_quote['volume']:,}\n"
                context += f"  • Last Updated: {live_quote['last_updated']}\n"
            
            # Also get local historical data
            local_data = search_stock_data(symbol)
            if local_data:
                stock = local_data[0]
                context += f"\n📈 Historical Data for {symbol}:\n"
                for key, value in stock.items():
                    if value is not None and key not in ['change_numeric']:
                        context += f"  • {key}: {value}\n"
        
        # Check if asking about market overview
        market_keywords = ['market', 'nifty', 'sensex', 'overview', 'trend', 'gainers', 'losers', 'top']
        if any(kw in query_lower for kw in market_keywords) and not symbol:
            overview = get_market_overview()
            if 'error' not in overview:
                context += f"\n📊 Market Overview ({overview['timestamp']}):\n"
                context += f"Total stocks tracked: {overview['total_stocks']}\n\n"
                
                if overview['top_gainers']:
                    context += "🟢 Top Gainers:\n"
                    for stock in overview['top_gainers'][:3]:
                        sym = stock.get('symbol', 'N/A')
                        change = stock.get('change_numeric', 0)
                        price = stock.get('close', stock.get('last', 'N/A'))
                        context += f"  • {sym}: ₹{price} ({change:+.2f}%)\n"
                
                if overview['top_losers']:
                    context += "\n🔴 Top Losers:\n"
                    for stock in overview['top_losers'][:3]:
                        sym = stock.get('symbol', 'N/A')
                        change = stock.get('change_numeric', 0)
                        price = stock.get('close', stock.get('last', 'N/A'))
                        context += f"  • {sym}: ₹{price} ({change:+.2f}%)\n"
        
        # If no context gathered, search for relevant stocks
        if not context.strip():
            # Try to find any mentioned stocks
            matches = search_stock_data(query)
            if matches:
                context = "📊 Found Stock Data:\n"
                for stock in matches[:3]:
                    context += f"\n{stock.get('symbol', 'Unknown')}:\n"
                    for key, value in stock.items():
                        if value is not None and key not in ['change_numeric']:
                            context += f"  • {key}: {value}\n"
        
        if not context.strip():
            context = "No specific stock data found. I can help you with general stock market questions or specific stock queries. Try asking about a specific stock like 'What is the price of Reliance?' or 'Tell me about TCS stock'."
        
        return generate_ai_response(query, context)
        
    except Exception as e:
        logger.error(f"Error in chat: {e}", exc_info=True)
        return f"Sorry, an error occurred while processing your request: {str(e)}"


def generate_ai_response(query: str, context: str, is_greeting: bool = False) -> str:
    """
    Generate AI response using Groq API.
    
    Args:
        query: User query
        context: Stock data context
        is_greeting: Whether this is a greeting
    
    Returns:
        AI-generated response
    """
    groq_api_key = os.getenv('GROQ_API_KEY')
    
    if not groq_api_key:
        if is_greeting:
            return "Hello! 👋 I'm your Stock Analytics Assistant. I can help you with live stock prices, market trends, and company analysis. What would you like to know?"
        elif context:
            return f"Here's what I found:\n\n{context}"
        else:
            return "AI service is not configured. Please set the GROQ_API_KEY."
    
    try:
        if is_greeting:
            system_prompt = """You are a friendly stock market assistant named StockBot. 
Greet the user warmly and introduce yourself briefly. 
Mention that you can help with:
- Live stock prices and quotes
- Market trends and analysis  
- Top gainers and losers
- Company information
Keep it concise and friendly (2-3 sentences max)."""
            user_message = query
        else:
            system_prompt = """You are a helpful stock market analyst assistant. 
Analyze the provided stock data and answer the user's question clearly and concisely.
- Use the data provided to give accurate information
- Format numbers nicely (use ₹ for Indian stocks)
- Be helpful and informative
- If data is available, highlight key insights
- Keep responses focused and actionable"""
            
            user_message = f"""Stock Market Data:
{context}

User Question: {query}

Please provide a helpful, concise analysis based on the data above."""
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            resp = response.json()
            if "choices" in resp and resp["choices"]:
                return resp["choices"][0]["message"]["content"]
        
        # Fallback to context if AI fails
        if context:
            return f"Here's the data I found:\n\n{context}"
        
        return "Sorry, I couldn't process your request. Please try again."
        
    except Exception as e:
        logger.error(f"AI response error: {e}")
        if context:
            return f"Here's the data I found:\n\n{context}"
        return f"Sorry, an error occurred: {str(e)}"


# Legacy functions for backward compatibility
def seed_embeddings(rows, batch_size=32):
    """Legacy function - embeddings are no longer needed."""
    logger.info("Embeddings are no longer required. The chatbot now uses direct data search.")
    return True


def embed(text):
    """Legacy function - embeddings are no longer needed."""
    return []
