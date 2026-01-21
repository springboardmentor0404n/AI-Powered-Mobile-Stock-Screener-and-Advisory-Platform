"""
Query Validation and Synonyms Mapping for AI Chat
Handles LLM misinterpretations and normalizes user queries
"""
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, validator
import re
from enum import Enum

class QueryIntent(str, Enum):
    """Supported query intents"""
    STOCK_ANALYSIS = "stock_analysis"
    STOCK_COMPARISON = "stock_comparison"
    MARKET_OVERVIEW = "market_overview"
    PORTFOLIO_ADVICE = "portfolio_advice"
    SECTOR_ANALYSIS = "sector_analysis"
    TECHNICAL_ANALYSIS = "technical_analysis"
    FUNDAMENTAL_ANALYSIS = "fundamental_analysis"
    NEWS_SENTIMENT = "news_sentiment"
    GENERAL_QUESTION = "general_question"

class QueryAction(str, Enum):
    """Supported actions"""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    ANALYZE = "analyze"
    COMPARE = "compare"
    TRACK = "track"
    RESEARCH = "research"

class ValidatedQuery(BaseModel):
    """Schema for validated query"""
    original_query: str
    normalized_query: str
    intent: QueryIntent
    action: Optional[QueryAction] = None
    stock_symbols: List[str] = Field(default_factory=list)
    sector: Optional[str] = None
    time_frame: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    
    class Config:
        use_enum_values = True

# Comprehensive synonyms mapping
STOCK_SYNONYMS = {
    # Common company names to ticker symbols
    "reliance": ["RELIANCE", "RELIANCE-EQ"],
    "tcs": ["TCS", "TCS-EQ"],
    "infosys": ["INFY", "INFY-EQ"],
    "wipro": ["WIPRO", "WIPRO-EQ"],
    "hdfc bank": ["HDFCBANK", "HDFCBANK-EQ"],
    "icici bank": ["ICICIBANK", "ICICIBANK-EQ"],
    "sbi": ["SBIN", "SBIN-EQ"],
    "state bank": ["SBIN", "SBIN-EQ"],
    "bajaj finance": ["BAJFINANCE", "BAJAJFINANCE", "BAJFINANCE-EQ"],
    "bajaj finserv": ["BAJAJFINSV", "BAJAJFINSV-EQ"],
    "itc": ["ITC", "ITC-EQ"],
    "hindustan unilever": ["HINDUNILVR", "HINDUNILVR-EQ"],
    "hul": ["HINDUNILVR", "HINDUNILVR-EQ"],
    "bharti airtel": ["BHARTIARTL", "BHARTIARTL-EQ"],
    "airtel": ["BHARTIARTL", "BHARTIARTL-EQ"],
    "maruti": ["MARUTI", "MARUTI-EQ"],
    "maruti suzuki": ["MARUTI", "MARUTI-EQ"],
    "tata motors": ["TATAMOTORS", "TATAMOTORS-EQ"],
    "mahindra": ["M&M", "M&M-EQ"],
    "asian paints": ["ASIANPAINT", "ASIANPAINT-EQ"],
    "titan": ["TITAN", "TITAN-EQ"],
    "nestle": ["NESTLEIND", "NESTLEIND-EQ"],
    "kotak bank": ["KOTAKBANK", "KOTAKBANK-EQ"],
    "axis bank": ["AXISBANK", "AXISBANK-EQ"],
    "larsen": ["LT", "LT-EQ"],
    "l&t": ["LT", "LT-EQ"],
    "sun pharma": ["SUNPHARMA", "SUNPHARMA-EQ"],
    "dr reddy": ["DRREDDY", "DRREDDY-EQ"],
    "cipla": ["CIPLA", "CIPLA-EQ"],
    "adani": ["ADANIENT", "ADANIPORTS", "ADANIPOWER"],
}

ACTION_SYNONYMS = {
    "buy": ["buy", "purchase", "invest in", "add", "enter", "go long", "accumulate"],
    "sell": ["sell", "exit", "book profit", "square off", "short", "dump", "offload"],
    "hold": ["hold", "keep", "maintain", "retain", "continue", "stay invested"],
    "analyze": ["analyze", "analyse", "review", "check", "evaluate", "assess", "look at", "tell me about", "what about"],
    "compare": ["compare", "vs", "versus", "or", "better than", "difference between"],
    "track": ["track", "watch", "monitor", "follow", "keep eye on", "add to watchlist"],
    "research": ["research", "study", "investigate", "deep dive", "detailed analysis"],
}

SECTOR_SYNONYMS = {
    "it": ["it", "information technology", "tech", "software", "technology"],
    "banking": ["banking", "banks", "bank", "financial services"],
    "finance": ["finance", "nbfc", "financial", "fintech"],
    "pharma": ["pharma", "pharmaceutical", "healthcare", "medicine", "drugs"],
    "auto": ["auto", "automobile", "automotive", "car", "vehicle"],
    "fmcg": ["fmcg", "consumer goods", "fast moving consumer goods"],
    "energy": ["energy", "oil", "gas", "petroleum"],
    "metals": ["metals", "steel", "mining", "metal"],
    "realty": ["realty", "real estate", "property", "construction"],
}

TIME_FRAME_PATTERNS = {
    "short_term": ["today", "this week", "short term", "quick", "intraday", "day trading"],
    "medium_term": ["this month", "few months", "medium term", "swing", "3-6 months"],
    "long_term": ["long term", "years", "invest", "retirement", "wealth creation", "hold for long"],
}

class QueryValidator:
    """Validates and normalizes user queries"""
    
    def __init__(self):
        self.stock_synonyms = STOCK_SYNONYMS
        self.action_synonyms = ACTION_SYNONYMS
        self.sector_synonyms = SECTOR_SYNONYMS
        self.time_frame_patterns = TIME_FRAME_PATTERNS
    
    def normalize_query(self, query: str) -> str:
        """Normalize query by replacing synonyms"""
        normalized = query.lower().strip()
        
        # Replace stock name synonyms
        for standard, variants in self.stock_synonyms.items():
            for variant in variants:
                # Use word boundary to avoid partial matches
                pattern = r'\b' + re.escape(variant.lower()) + r'\b'
                if re.search(pattern, normalized):
                    normalized = re.sub(pattern, standard, normalized)
        
        return normalized
    
    def extract_stock_symbols(self, query: str) -> List[str]:
        """Extract stock symbols from query"""
        symbols = []
        query_lower = query.lower()
        
        # Check for known company names
        for company, tickers in self.stock_synonyms.items():
            if company in query_lower:
                symbols.extend(tickers[:1])  # Add primary ticker
        
        # Extract explicit tickers (e.g., TCS, INFY-EQ)
        ticker_pattern = r'\b([A-Z]{2,}(?:-[A-Z]{2})?)\b'
        matches = re.findall(ticker_pattern, query)
        symbols.extend(matches)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_symbols = []
        for symbol in symbols:
            if symbol not in seen:
                seen.add(symbol)
                unique_symbols.append(symbol)
        
        return unique_symbols
    
    def detect_intent(self, query: str, symbols: List[str]) -> QueryIntent:
        """Detect user's intent from query"""
        query_lower = query.lower()
        
        # Stock comparison
        if any(word in query_lower for word in ["vs", "versus", "or", "compare", "better than"]) and len(symbols) > 1:
            return QueryIntent.STOCK_COMPARISON
        
        # Technical analysis
        if any(word in query_lower for word in ["chart", "technical", "support", "resistance", "rsi", "macd", "moving average"]):
            return QueryIntent.TECHNICAL_ANALYSIS
        
        # Fundamental analysis
        if any(word in query_lower for word in ["pe ratio", "debt", "roe", "fundamental", "valuation", "earnings", "revenue"]):
            return QueryIntent.FUNDAMENTAL_ANALYSIS
        
        # Sector analysis
        if any(sector in query_lower for sector in self.sector_synonyms.keys()):
            return QueryIntent.SECTOR_ANALYSIS
        
        # Portfolio advice
        if any(word in query_lower for word in ["portfolio", "diversify", "allocation", "rebalance"]):
            return QueryIntent.PORTFOLIO_ADVICE
        
        # Market overview
        if any(word in query_lower for word in ["market", "nifty", "sensex", "index", "indices", "market trend"]):
            return QueryIntent.MARKET_OVERVIEW
        
        # Stock analysis (default for queries with symbols)
        if symbols:
            return QueryIntent.STOCK_ANALYSIS
        
        return QueryIntent.GENERAL_QUESTION
    
    def detect_action(self, query: str) -> Optional[QueryAction]:
        """Detect action from query"""
        query_lower = query.lower()
        
        for action, keywords in self.action_synonyms.items():
            if any(keyword in query_lower for keyword in keywords):
                return QueryAction(action)
        
        return None
    
    def detect_sector(self, query: str) -> Optional[str]:
        """Detect sector from query"""
        query_lower = query.lower()
        
        for sector, keywords in self.sector_synonyms.items():
            if any(keyword in query_lower for keyword in keywords):
                return sector.upper()
        
        return None
    
    def detect_time_frame(self, query: str) -> Optional[str]:
        """Detect time frame from query"""
        query_lower = query.lower()
        
        for time_frame, keywords in self.time_frame_patterns.items():
            if any(keyword in query_lower for keyword in keywords):
                return time_frame
        
        return None
    
    def calculate_confidence(self, query: str, symbols: List[str], intent: QueryIntent) -> float:
        """Calculate confidence score for validation"""
        confidence = 0.5
        
        # Higher confidence if we found stock symbols
        if symbols:
            confidence += 0.2
        
        # Higher confidence for specific intents
        if intent in [QueryIntent.STOCK_ANALYSIS, QueryIntent.STOCK_COMPARISON]:
            confidence += 0.1
        
        # Lower confidence for very short queries
        if len(query.split()) < 3:
            confidence -= 0.1
        
        # Higher confidence for well-formed questions
        if any(word in query.lower() for word in ["should", "can", "what", "how", "why", "when"]):
            confidence += 0.1
        
        return max(0.0, min(1.0, confidence))
    
    def validate(self, query: str) -> ValidatedQuery:
        """Validate and normalize a user query"""
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        # Normalize query
        normalized = self.normalize_query(query)
        
        # Extract components
        symbols = self.extract_stock_symbols(query)
        intent = self.detect_intent(normalized, symbols)
        action = self.detect_action(normalized)
        sector = self.detect_sector(normalized)
        time_frame = self.detect_time_frame(normalized)
        
        # Calculate confidence
        confidence = self.calculate_confidence(query, symbols, intent)
        
        return ValidatedQuery(
            original_query=query,
            normalized_query=normalized,
            intent=intent,
            action=action,
            stock_symbols=symbols,
            sector=sector,
            time_frame=time_frame,
            confidence=confidence
        )

# Singleton instance
query_validator = QueryValidator()
