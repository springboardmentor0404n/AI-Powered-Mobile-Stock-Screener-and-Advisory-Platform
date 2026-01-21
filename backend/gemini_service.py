"""
AI Service with Google Gemini Integration
Falls back to pattern matching if API key is not available
"""
import re
import json
import os
import warnings
import time
from typing import Optional, List, Dict
from pathlib import Path
from google.genai import types

# Simple retry logic without external deps for now
def retry_gemini(retries=3):
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_error = None
            for i in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    error_str = str(e)
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                         print(f"[AI SERVICE] ⚠️ Retry {i+1}/{retries} due to quota limit...")
                         time.sleep(2 * (i + 1)) # Exponential backoff
                    elif "503" in error_str or "500" in error_str:
                         print(f"[AI SERVICE] ⚠️ Retry {i+1}/{retries} due to server error...")
                         time.sleep(1)
                    else:
                        raise e # Don't retry client errors
            raise last_error
        return wrapper
    return decorator

# Suppress FutureWarning from google.generativeai
warnings.filterwarnings('ignore', category=FutureWarning, module='google.generativeai')

# Load .env from the backend directory
backend_dir = Path(__file__).parent
env_path = backend_dir / '.env'
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

class GeminiService:
    """
    AI service with Google Gemini integration and smart fallback
    """
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.use_real_ai = bool(self.gemini_api_key)
        
        # Response cache for faster repeated queries
        self._response_cache = {}
        self._cache_ttl = 300  # 5 minutes
        
        if self.use_real_ai:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.gemini_api_key)
                
                # Check available models
                self.model_id = self._get_working_model_id()
                print(f"[AI SERVICE] ✅ Google Gemini initialized with model: {self.model_id}")
            except Exception as e:
                print(f"[AI SERVICE] ❌ Failed to initialize Gemini: {e}")
                self.use_real_ai = False
        
        # Stock symbol mapping
        self.stock_map = {
            'reliance': 'RELIANCE', 'ril': 'RELIANCE',
            'tcs': 'TCS', 'tata consultancy': 'TCS',
            'infosys': 'INFY', 'infy': 'INFY',
            'hdfc bank': 'HDFCBANK', 'hdfc': 'HDFCBANK', 'hdfcbank': 'HDFCBANK',
            'icici': 'ICICIBANK', 'icici bank': 'ICICIBANK',
            'wipro': 'WIPRO',
            'bharti airtel': 'BHARTIARTL', 'airtel': 'BHARTIARTL',
            'tata motors': 'TATAMOTORS', 'tatamotors': 'TATAMOTORS',
            'mahindra': 'M&M', 'm&m': 'M&M',
            'maruti': 'MARUTI', 'maruti suzuki': 'MARUTI',
            'asian paints': 'ASIANPAINT',
            'bajaj': 'BAJFINANCE',
            'sun pharma': 'SUNPHARMA', 'sunpharma': 'SUNPHARMA',
            'itc': 'ITC',
            'larsen': 'LT', 'l&t': 'LT',
            'ultratech': 'ULTRACEMCO',
            'sbi': 'SBIN', 'state bank': 'SBIN',
            'titan': 'TITAN',
            'nestle': 'NESTLEIND',
            'hul': 'HINDUNILVR', 'hindustan unilever': 'HINDUNILVR',
            'adani': 'ADANIENT',
        }
        
        # Sector leaders
        self.sector_map = {
            'it': 'TCS', 'tech': 'TCS', 'software': 'TCS', 'technology': 'TCS',
            'bank': 'HDFCBANK', 'banking': 'HDFCBANK', 'finance': 'BAJFINANCE',
            'pharma': 'SUNPHARMA', 'healthcare': 'SUNPHARMA', 'pharmaceutical': 'SUNPHARMA',
            'auto': 'TATAMOTORS', 'automobile': 'TATAMOTORS', 'car': 'MARUTI',
            'telecom': 'BHARTIARTL', 'telecommunication': 'BHARTIARTL',
            'energy': 'RELIANCE', 'oil': 'RELIANCE', 'gas': 'RELIANCE',
            'fmcg': 'ITC', 'consumer': 'ITC',
            'cement': 'ULTRACEMCO', 'construction': 'LT',
            'metal': 'TATASTEEL', 'steel': 'TATASTEEL',
        }
    
    def _get_working_model_id(self) -> str:
        """Find the best available model for the API key"""
        # Prioritize fastest models first
        candidates = [
            "gemini-2.0-flash-exp",  # Fastest
            "gemini-1.5-flash-8b",   # Very fast
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro-002",
            "gemini-1.5-pro",
        ]
        
        # Try to use each model with a dummy request to check availability & quota
        print("[AI SERVICE] Testing models for availability...")
        for candidate in candidates:
            try:
                # 'ping' the model to see if it works
                self.client.models.generate_content(
                    model=candidate,
                    contents="Test"
                )
                print(f"[AI SERVICE] Checks passed for: {candidate}")
                return candidate
            except Exception as e:
                # Log usage errors but continue
                error_str = str(e)
                if "429" in error_str or "404" in error_str:
                     print(f"[AI SERVICE] Skipping {candidate} (Error: {error_str[:50]}...)")
                     continue
                # If other specific error, might skip too
                print(f"[AI SERVICE] Skipping {candidate} due to error: {e}")
                continue
            
        print("[AI SERVICE] ⚠️ No working model found in candidates. Defaulting to gemini-1.5-flash")
        # Fallback: return the standard one and hope
        return "gemini-1.5-flash"
    
    @retry_gemini(retries=2)
    def _generate_with_fallback(self, prompt=None, contents=None):
        """Try primary model, then fallback to lighter models"""
        models_to_try = [self.model_id, "gemini-1.5-flash-8b", "gemini-1.5-flash"]
        # Deduplicate
        models_to_try = list(dict.fromkeys(models_to_try))
        
        last_exception = None
        
        for model in models_to_try:
            try:
                # print(f"[AI SERVICE] Generating with {model}...")
                if contents:
                     return self.client.models.generate_content(model=model, contents=contents)
                else:
                     return self.client.models.generate_content(model=model, contents=prompt)
            except Exception as e:
                # If it's a critical auth error, don't retry other models
                if "API_KEY" in str(e) or "PERMISSION_DENIED" in str(e):
                    raise e
                    
                print(f"[AI SERVICE] Model {model} failed: {e}. Trying next...")
                last_exception = e
        
        raise last_exception

    def chat(
        self, 
        prompt: str, 
        model: str = "smart-fallback",
        stream: bool = False
    ) -> str:
        """
        Generate intelligent responses for stock queries
        
        Args:
            prompt: The text prompt
            model: Model name (ignored, uses smart fallback)
            stream: Whether to stream responses (ignored)
            
        Returns:
            Intelligent stock-related response
        """
        if self.use_real_ai:
            try:
                # Enforce SEBI Compliance & Informational Tone
                system_instruction = (
                    "Context: You are an AI assistant for an Indian Stock Screener App.\n"
                    "Role: Provide market analysis and data-driven insights.\n"
                    "Constraints (CRITICAL):\n"
                    "1. INFORMATIONAL ONLY: Do not give direct 'Buy', 'Sell', or 'Hold' recommendations.\n"
                    "2. DISCLAIMER: Always imply or state that you are not a SEBI registered advisor.\n"
                    "3. TONE: Use phrases like 'Technical indicators suggest...', 'Historical data shows...', 'Analysts often look at...' instead of 'You should buy...'.\n"
                    "4. COMPLIANCE: If asked for a tip, refuse politely and offer data analysis instead.\n"
                    "5. SYNONYMS: Understand that 'IT' means 'Technology', 'Auto' means 'Automobile', etc.\n\n"
                    f"User Query: {prompt}"
                )
                
                # Check cache first
                cache_key = f"chat:{hash(prompt)}"
                if cache_key in self._response_cache:
                    cached_data, timestamp = self._response_cache[cache_key]
                    if time.time() - timestamp < self._cache_ttl:
                        print(f"[AI SERVICE] Cache hit for prompt")
                        return cached_data
                
                response = self._generate_with_fallback(system_instruction, contents=None)
                
                # Append standard disclaimer if not present
                final_text = response.text
                disclaimer = "\\n\\n*(Disclaimer: This is AI-generated for informational purposes only and is not SEBI-registered investment advice. Please consult a profit advisor before trading.)*"
                
                # Append standard disclaimer if not present
                final_text = response.text
                disclaimer = "\n\n*(Disclaimer: This is AI-generated for informational purposes only and is not SEBI-registered investment advice. Please consult a qualified financial advisor before trading.)*"
                
                if "Disclaimer:" not in final_text and "not SEBI-registered" not in final_text:
                    final_text += disclaimer
                
                # Cache the response
                self._response_cache[cache_key] = (final_text, time.time())
                    
                return final_text
            except Exception as e:
                print(f"[AI SERVICE] Gemini error in chat(): {e}")
                # Fall back to pattern matching
        
        return self._smart_response(prompt)
    
    def chat_with_history(
        self,
        messages: List[Dict[str, str]],
        model: str = "smart-fallback"
    ) -> str:
        """
        Generate text with conversation history
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (ignored)
            
        Returns:
            Generated text response
        """
        print(f"[AI SERVICE] chat_with_history called, use_real_ai={self.use_real_ai}")
        
        if self.use_real_ai:
            try:
                # Convert messages to Gemini format
                chat_history = []
                user_message = ""
                
                for msg in messages:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    if isinstance(content, dict):
                        content = content.get('text', '') or str(content)
                    
                    if role == "system":
                        # Prepend system message to first user message
                        continue
                    elif role == "user":
                        user_message = content
                    elif role == "assistant":
                        if user_message:
                            chat_history.append({
                                "role": "user",
                                "parts": [user_message]
                            })
                            user_message = ""
                        chat_history.append({
                            "role": "model",
                            "parts": [content]
                        })
                
                # Get the system prompt if it exists
                system_content = ""
                for msg in messages:
                    if msg.get("role") == "system":
                        content = msg.get("content", "")
                        if isinstance(content, dict):
                            system_content = content.get('text', '') or str(content)
                        else:
                            system_content = str(content)
                        break
                
                # Add system prompt to the final user message if present
                if system_content and user_message:
                    user_message = f"{system_content}\\n\\n{user_message}"
                
                print(f"[AI SERVICE] Sending to Gemini with {len(chat_history)} history messages")
                
                # Start a chat session with history
                # Note: google-genai handles chat history slightly differently, often just by passing the list of contents
                # Construct full conversation history including the new message
                
                full_history = []
                for msg in chat_history:
                    role = msg.get("role")
                    parts = msg.get("parts", [])
                    content = parts[0] if parts else ""
                    
                    # Ensure content is string
                    if isinstance(content, dict):
                        content = content.get('text', '') or str(content)
                    elif not isinstance(content, str):
                        content = str(content)

                    full_history.append(types.Content(role=role, parts=[types.Part.from_text(text=content)]))

                # Add the user's new message
                full_history.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

                print(f"[AI SERVICE] Using model: {self.model_id}")
                response = self._generate_with_fallback(contents=full_history)
                print(f"[AI SERVICE] ✓ Gemini response received: {len(response.text)} chars")
                return response.text
                
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    print(f"[AI SERVICE] ⚠️ Quota exceeded (429). Using fallback.")
                elif "404" in error_msg or "NOT_FOUND" in error_msg:
                    print(f"[AI SERVICE] ⚠️ Model found but validation failed (404). Using fallback.")
                else:
                    print(f"[AI SERVICE] ✗ Gemini error: {e}")
                    import traceback
                    traceback.print_exc()
                # Fall back to pattern matching
        
        print(f"[AI SERVICE] Using fallback pattern matching")
        # Fallback: Extract the last user message
        last_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_msg = msg.get("content", "")
                break
        
        return self._smart_response(last_msg)
    
    def _smart_response(self, prompt: str) -> str:
        """Generate intelligent response based on prompt analysis"""
        prompt_lower = prompt.lower()
        
        # Check if it's a stock symbol search query
        if 'return only the symbol' in prompt_lower or ('user query:' in prompt_lower and 'symbol' in prompt_lower):
            # Extract the actual query
            query_match = re.search(r'user query:\\s*["\']?([^"\'\\n]+)', prompt, re.IGNORECASE)
            if query_match:
                query = query_match.group(1).strip()
                return self._find_stock_symbol(query)
        
        # Check for sentiment analysis / insight request
        if 'sentiment' in prompt_lower and 'json' in prompt_lower:
            # Extract stock symbol
            symbol_match = re.search(r'stock\\s+["\']?([A-Z]+)', prompt)
            if symbol_match:
                symbol = symbol_match.group(1)
                return self._generate_insight(symbol)
        
        # Check for screener/analysis query (JSON with stocks array)
        if '"stocks"' in prompt_lower and ('intent' in prompt_lower or 'criteria' in prompt_lower):
            return self._analyze_screener_query(prompt)
        
        # General chat response with stock context
        return self._generate_chat_response(prompt)
    
    def _find_stock_symbol(self, query: str) -> str:
        """Find stock symbol from query"""
        query_lower = query.lower()
        
        # Direct stock name match
        for name, symbol in self.stock_map.items():
            if name in query_lower:
                return symbol
        
        # Sector match
        for sector, symbol in self.sector_map.items():
            if sector in query_lower:
                return symbol
        
        # If query is already a symbol (all caps, short)
        query_clean = query.strip().upper()
        if len(query_clean) <= 15 and query_clean.isalpha():
            return query_clean
        
        # Default fallback
        return query.strip().upper()
    
    def _generate_insight(self, symbol: str) -> str:
        """Generate sentiment insight JSON"""
        # Simple sentiment logic based on common knowledge
        bullish_stocks = ['TCS', 'INFY', 'HDFCBANK', 'RELIANCE', 'BAJFINANCE', 'TITAN']
        bearish_stocks = ['YESBANK', 'VODAFONEIDEA', 'ADANIENT']
        
        if symbol in bullish_stocks:
            sentiment = "Bullish"
            insight = f"{symbol} shows strong fundamentals with consistent growth. Market sentiment remains positive."
        elif symbol in bearish_stocks:
            sentiment = "Bearish"
            insight = f"{symbol} faces headwinds with market concerns. Caution advised for investors."
        else:
            sentiment = "Neutral"
            insight = f"{symbol} is trading in a range with mixed signals. Wait for clear trend confirmation."
        
        result = {
            "sentiment": sentiment,
            "insight": insight,
            "color": "#10B981" if sentiment == "Bullish" else "#EF4444" if sentiment == "Bearish" else "#3B82F6"
        }
        
        return json.dumps(result)
    
    def _analyze_screener_query(self, prompt: str) -> str:
        """Analyze screener query and suggest stocks"""
        prompt_lower = prompt.lower()
        
        stocks = []
        intent = "analysis"
        
        # Helper for word boundary check
        def has_keyword(keywords, text):
            pattern = r'\b(' + '|'.join(map(re.escape, keywords)) + r')\b'
            return bool(re.search(pattern, text))

        # Detect sector mentions with synonyms using word boundaries
        if has_keyword(['it', 'tech', 'software', 'technology', 'infotech'], prompt_lower):
            stocks = ["TCS.NSE", "INFY.NSE", "WIPRO.NSE", "HCLTECH.NSE", "TECHM.NSE"]
            intent = "analysis"
        elif has_keyword(['bank', 'finance', 'banking', 'fintech', 'banks'], prompt_lower):
            stocks = ["HDFCBANK.NSE", "ICICIBANK.NSE", "SBIN.NSE", "KOTAKBANK.NSE", "AXISBANK.NSE"]
            intent = "analysis"
        elif has_keyword(['pharma', 'healthcare', 'drugs', 'medicine'], prompt_lower):
            stocks = ["SUNPHARMA.NSE", "DRREDDY.NSE", "CIPLA.NSE", "DIVISLAB.NSE"]
            intent = "analysis"
        elif has_keyword(['auto', 'car', 'vehicle', 'ev', 'automobile', 'cars'], prompt_lower):
            stocks = ["TATAMOTORS.NSE", "MARUTI.NSE", "M&M.NSE", "BAJAJ-AUTO.NSE"]
            intent = "analysis"
        elif has_keyword(['fmcg', 'consumer', 'goods'], prompt_lower):
            stocks = ["ITC.NSE", "HINDUNILVR.NSE", "NESTLEIND.NSE", "BRITANNIA.NSE"]
            intent = "analysis"
        else:
            # Default to top market cap stocks
            stocks = ["RELIANCE.NSE", "TCS.NSE", "HDFCBANK.NSE", "INFY.NSE", "ITC.NSE"]
            intent = "analysis"
        
        # Detect intent
        if any(word in prompt_lower for word in ['price', 'trading', 'chart']):
            intent = "price"
        elif any(word in prompt_lower for word in ['technical', 'rsi', 'macd']):
            intent = "technical"
        
        result = {
            "stocks": stocks,
            "intent": intent,
            "screener_criteria": "Top performing stocks in the requested sector"
        }
        
        return json.dumps(result)
    
    def _generate_chat_response(self, prompt: str) -> str:
        """Generate conversational response"""
        prompt_lower = prompt.lower()
        
        # Extract stock symbol if mentioned
        stock_symbol = None
        for name, symbol in self.stock_map.items():
            if name in prompt_lower:
                stock_symbol = symbol
                break
        
        # Price queries
        if any(word in prompt_lower for word in ['price', 'cost', 'trading at']):
            if stock_symbol:
                return f"I can see you're interested in {stock_symbol}'s price. The real-time market data is being fetched from our data providers. Please check the stock details for the latest pricing information."
            return "I can help you with stock prices. Please specify which stock you're interested in."
        
        # Recommendation queries
        if any(word in prompt_lower for word in ['buy', 'sell', 'invest', 'recommendation']):
            if stock_symbol:
                return f"Based on current market conditions, {stock_symbol} shows interesting potential. However, please do your own research and consult with a financial advisor before making investment decisions."
            return "I'd be happy to discuss investment options. Which stocks or sectors are you interested in?"
        
        # Comparison queries
        if 'compare' in prompt_lower or 'vs' in prompt_lower or 'versus' in prompt_lower:
            return "To compare stocks effectively, I'd recommend looking at key metrics like P/E ratio, market cap, revenue growth, and sector performance. Would you like me to fetch specific data for comparison?"
        
        # General queries
        if any(word in prompt_lower for word in ['how', 'what', 'why', 'when']):
            if stock_symbol:
                return f"{stock_symbol} is a well-known stock in the Indian market. For detailed analysis, I can provide market data, historical trends, and technical indicators. What specific information would you like to know?"
            return "I'm here to help with stock market queries. You can ask about specific stocks, sectors, market trends, or investment strategies."
        
        # Default response
        return "I'm your AI stock market assistant. I can help you with stock information, market analysis, and investment insights. Feel free to ask about any Indian stocks (NSE/BSE) or sectors you're interested in!"

# Global instance - will be initialized lazily
gemini_service = None

def get_gemini_service():
    """Get or create the global GeminiService instance"""
    global gemini_service
    if gemini_service is None:
        gemini_service = GeminiService()
    return gemini_service

# For backwards compatibility/easy access
gemini_service = get_gemini_service()

# Available models
AVAILABLE_MODELS = [
    "gemini-pro",
    "gemini-1.5-flash"
]
