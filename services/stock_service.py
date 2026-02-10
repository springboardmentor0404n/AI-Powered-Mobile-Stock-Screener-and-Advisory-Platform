"""
Stock Service - Optimized Real-time stock data using Yahoo Finance API
With aggressive caching to prevent lag
"""
import logging
import os
import threading
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import yfinance
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
    logger.info("yfinance library loaded successfully")
except ImportError:
    YFINANCE_AVAILABLE = False
    logger.warning("yfinance not installed. Run: pip install yfinance")

# ==================== CACHING SYSTEM ====================
_company_cache = {}
_company_cache_timeout = 120  # 2 minutes for individual stocks

_screener_cache = None
_screener_cache_time = None
_screener_cache_timeout = 300  # 5 minutes for screener (50 stocks is slow)

_historical_cache = {}
_historical_cache_timeout = 600  # 10 minutes for historical data

_cache_lock = threading.Lock()

# ==================== STOCK LIST ====================
NIFTY50_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "display": "RELIANCE"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "display": "TCS"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "display": "HDFCBANK"},
    {"symbol": "INFY.NS", "name": "Infosys", "display": "INFY"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "display": "ICICIBANK"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "display": "HINDUNILVR"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "display": "SBIN"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel", "display": "BHARTIARTL"},
    {"symbol": "ITC.NS", "name": "ITC Limited", "display": "ITC"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "display": "KOTAKBANK"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro", "display": "LT"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank", "display": "AXISBANK"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "display": "BAJFINANCE"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints", "display": "ASIANPAINT"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki", "display": "MARUTI"},
    {"symbol": "TITAN.NS", "name": "Titan Company", "display": "TITAN"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharma", "display": "SUNPHARMA"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement", "display": "ULTRACEMCO"},
    {"symbol": "WIPRO.NS", "name": "Wipro", "display": "WIPRO"},
    {"symbol": "NESTLEIND.NS", "name": "Nestle India", "display": "NESTLEIND"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra", "display": "M&M"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies", "display": "HCLTECH"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv", "display": "BAJAJFINSV"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corp", "display": "POWERGRID"},
    {"symbol": "NTPC.NS", "name": "NTPC Limited", "display": "NTPC"},
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel", "display": "TATASTEEL"},
    {"symbol": "ONGC.NS", "name": "ONGC", "display": "ONGC"},
    {"symbol": "JSWSTEEL.NS", "name": "JSW Steel", "display": "JSWSTEEL"},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra", "display": "TECHM"},
    {"symbol": "COALINDIA.NS", "name": "Coal India", "display": "COALINDIA"},
    {"symbol": "HINDALCO.NS", "name": "Hindalco", "display": "HINDALCO"},
    {"symbol": "DRREDDY.NS", "name": "Dr. Reddy's", "display": "DRREDDY"},
    {"symbol": "CIPLA.NS", "name": "Cipla", "display": "CIPLA"},
    {"symbol": "EICHERMOT.NS", "name": "Eicher Motors", "display": "EICHERMOT"},
    {"symbol": "DIVISLAB.NS", "name": "Divi's Laboratories", "display": "DIVISLAB"},
    {"symbol": "BRITANNIA.NS", "name": "Britannia", "display": "BRITANNIA"},
    {"symbol": "GRASIM.NS", "name": "Grasim Industries", "display": "GRASIM"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises", "display": "ADANIENT"},
    {"symbol": "ADANIPORTS.NS", "name": "Adani Ports", "display": "ADANIPORTS"},
    {"symbol": "BPCL.NS", "name": "BPCL", "display": "BPCL"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp", "display": "HEROMOTOCO"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto", "display": "BAJAJ-AUTO"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank", "display": "INDUSINDBK"},
    {"symbol": "SBILIFE.NS", "name": "SBI Life Insurance", "display": "SBILIFE"},
    {"symbol": "HDFCLIFE.NS", "name": "HDFC Life", "display": "HDFCLIFE"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals", "display": "APOLLOHOSP"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer", "display": "TATACONSUM"},
    {"symbol": "UPL.NS", "name": "UPL Limited", "display": "UPL"},
]


def _get_yf_symbol(symbol):
    """Convert display symbol to Yahoo Finance symbol."""
    symbol = symbol.upper().strip()
    if symbol.endswith('.NS') or symbol.endswith('.BO'):
        return symbol
    for stock in NIFTY50_STOCKS:
        if stock['display'] == symbol:
            return stock['symbol']
    return f"{symbol}.NS"


def _get_display_symbol(yf_symbol):
    """Convert Yahoo Finance symbol to display symbol."""
    for stock in NIFTY50_STOCKS:
        if stock['symbol'] == yf_symbol:
            return stock['display']
    return yf_symbol.replace('.NS', '').replace('.BO', '')


def _get_stock_name(symbol):
    """Get company name from symbol."""
    for stock in NIFTY50_STOCKS:
        if stock['display'] == symbol or stock['symbol'] == symbol:
            return stock['name']
    return symbol


def _is_cache_valid(cached_time, timeout):
    """Check if cache is still valid."""
    if cached_time is None:
        return False
    return (datetime.now() - cached_time).total_seconds() < timeout


def get_company(symbol):
    """Get complete company information - OPTIMIZED with caching."""
    if not YFINANCE_AVAILABLE:
        logger.error("yfinance not available")
        return None
    
    try:
        symbol = symbol.upper().strip()
        cache_key = symbol
        
        # Check cache first
        with _cache_lock:
            if cache_key in _company_cache:
                cached_data, cached_time = _company_cache[cache_key]
                if _is_cache_valid(cached_time, _company_cache_timeout):
                    logger.info(f"Cache HIT for {symbol}")
                    return cached_data
        
        yf_symbol = _get_yf_symbol(symbol)
        display_symbol = _get_display_symbol(yf_symbol)
        
        logger.info(f"Cache MISS - Fetching real-time data for: {yf_symbol}")
        
        ticker = yf.Ticker(yf_symbol)
        
        # Use fast_info for speed when available, fall back to info
        try:
            fast = ticker.fast_info
            current_price = float(fast.last_price) if hasattr(fast, 'last_price') else 0
            prev_close = float(fast.previous_close) if hasattr(fast, 'previous_close') else 0
            market_cap = int(fast.market_cap) if hasattr(fast, 'market_cap') else 0
            # Fallback: if fast_info market_cap is 0, try info['marketCap']
            if market_cap == 0:
                try:
                    info = ticker.info
                    market_cap = info.get('marketCap', 0) or 0
                except Exception:
                    pass
            day_high = float(fast.day_high) if hasattr(fast, 'day_high') else current_price
            day_low = float(fast.day_low) if hasattr(fast, 'day_low') else current_price
            volume = int(fast.last_volume) if hasattr(fast, 'last_volume') else 0
            fifty_two_high = float(fast.year_high) if hasattr(fast, 'year_high') else current_price
            fifty_two_low = float(fast.year_low) if hasattr(fast, 'year_low') else current_price
        except:
            current_price = prev_close = 0
            market_cap = volume = 0
            day_high = day_low = fifty_two_high = fifty_two_low = 0
        
        # If fast_info didn't work, try full info
        if current_price == 0:
            info = ticker.info
            current_price = info.get('regularMarketPrice', 0) or info.get('currentPrice', 0)
            prev_close = info.get('previousClose', 0)
            market_cap = info.get('marketCap', 0)
            day_high = info.get('regularMarketDayHigh', current_price)
            day_low = info.get('regularMarketDayLow', current_price)
            volume = info.get('regularMarketVolume', 0)
            fifty_two_high = info.get('fiftyTwoWeekHigh', current_price)
            fifty_two_low = info.get('fiftyTwoWeekLow', current_price)
        
        if current_price == 0:
            logger.warning(f"No price data for {yf_symbol}")
            return None
        
        change = current_price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        # Get additional info (this is slower, but needed for fundamentals)
        info = ticker.info
        
        eps = info.get('trailingEps', 0) or info.get('forwardEps', 0) or 0
        pe_ratio = info.get('trailingPE', 0) or info.get('forwardPE', 0) or 0
        book_value = info.get('bookValue', 0) or 0
        # dividendYield from Yahoo is already in percent form (e.g., 1.96 means 1.96%)
        dividend_yield = info.get('dividendYield', 0) or 0
        roe = (info.get('returnOnEquity', 0) or 0) * 100
        roa = (info.get('returnOnAssets', 0) or 0) * 100
        revenue_growth = (info.get('revenueGrowth', 0) or 0) * 100
        beta = info.get('beta', 0) or 0
        
        # Fetch quarterly income data for the performance chart
        q1_profit = q2_profit = q3_profit = q4_profit = 0
        try:
            quarterly_income = ticker.quarterly_income_stmt
            if quarterly_income is not None and not quarterly_income.empty:
                if 'Net Income' in quarterly_income.index:
                    net_incomes = quarterly_income.loc['Net Income'].values
                    # Convert to Crores (divide by 10^7) for display
                    if len(net_incomes) >= 4:
                        q1_profit = float(net_incomes[3]) / 1e7 if net_incomes[3] else 0  # Oldest
                        q2_profit = float(net_incomes[2]) / 1e7 if net_incomes[2] else 0
                        q3_profit = float(net_incomes[1]) / 1e7 if net_incomes[1] else 0
                        q4_profit = float(net_incomes[0]) / 1e7 if net_incomes[0] else 0  # Latest
                    elif len(net_incomes) >= 1:
                        q4_profit = float(net_incomes[0]) / 1e7 if net_incomes[0] else 0
        except Exception as e:
            logger.debug(f"Could not fetch quarterly income for {symbol}: {e}")
        
        promoter_holding = fii_holding = dii_holding = 0
        
        result = {
            "symbol": display_symbol,
            "company": info.get('longName', '') or info.get('shortName', '') or _get_stock_name(display_symbol),
            "date": datetime.now().strftime('%d-%m-%Y'),
            "open": info.get('regularMarketOpen', current_price) or current_price,
            "high": day_high or current_price,
            "low": day_low or current_price,
            "close": current_price,
            "last": current_price,
            "prev close": prev_close,
            "prev_close": prev_close,
            "change": round(change, 2),
            "%chng": round(change_pct, 2),
            "volume": volume,
            "turnover": volume * current_price,
            "vwap": current_price,
            "52w high": fifty_two_high,
            "52w low": fifty_two_low,
            "data_source": "yahoo_finance_realtime",
            "industry": info.get('industry', '') or info.get('sector', ''),
            "sector": info.get('sector', ''),
            "market_cap": market_cap,
            "eps": round(eps, 2) if eps else 0,
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else 0,
            "book_value": round(book_value, 2) if book_value else 0,
            "dividend_yield": round(dividend_yield, 2) if dividend_yield else 0,
            "roe": round(roe, 2) if roe else 0,
            "roa": round(roa, 2),
            "revenue_growth": round(revenue_growth, 2),
            "beta": round(beta, 2),
            "promoter_holding": promoter_holding,
            "fii_holding": fii_holding,
            "dii_holding": dii_holding,
            "q1_profit": q1_profit,
            "q2_profit": q2_profit,
            "q3_profit": q3_profit,
            "q4_profit": q4_profit,
        }
        
        # Cache the result
        with _cache_lock:
            _company_cache[cache_key] = (result, datetime.now())
        
        logger.info(f"Got data for {symbol}: Rs{current_price}")
        return result
        
    except Exception as e:
        logger.error(f"Error getting company {symbol}: {e}")
        return None


def screener():
    """Get data for all Nifty 50 stocks - OPTIMIZED with heavy caching."""
    global _screener_cache, _screener_cache_time
    
    if not YFINANCE_AVAILABLE:
        return []
    
    # Check screener cache (longer timeout since it's 50 API calls)
    with _cache_lock:
        if _screener_cache is not None and _is_cache_valid(_screener_cache_time, _screener_cache_timeout):
            logger.info("Screener cache HIT - returning cached data")
            return _screener_cache
    
    try:
        logger.info("Screener cache MISS - Fetching all stocks (this may take a moment)")
        results = []
        
        # Batch download for efficiency
        symbols = [stock['symbol'] for stock in NIFTY50_STOCKS]
        symbols_str = ' '.join(symbols)
        
        try:
            # Try batch download first (much faster)
            tickers = yf.Tickers(symbols_str)
            
            for stock in NIFTY50_STOCKS:
                try:
                    symbol = stock['symbol']
                    ticker = tickers.tickers.get(symbol.replace('.', '-'), None)
                    
                    if ticker is None:
                        # Fallback to individual fetch
                        ticker = yf.Ticker(symbol)
                    
                    # Use fast_info for speed
                    try:
                        fast = ticker.fast_info
                        current_price = float(fast.last_price) if hasattr(fast, 'last_price') else 0
                        prev_close = float(fast.previous_close) if hasattr(fast, 'previous_close') else 0
                        day_high = float(fast.day_high) if hasattr(fast, 'day_high') else current_price
                        day_low = float(fast.day_low) if hasattr(fast, 'day_low') else current_price
                        volume = int(fast.last_volume) if hasattr(fast, 'last_volume') else 0
                        fast_market_cap = int(fast.market_cap) if hasattr(fast, 'market_cap') else 0
                    except:
                        info = ticker.info
                        current_price = info.get('regularMarketPrice', 0) or 0
                        prev_close = info.get('previousClose', 0)
                        day_high = info.get('regularMarketDayHigh', current_price)
                        day_low = info.get('regularMarketDayLow', current_price)
                        volume = info.get('regularMarketVolume', 0)
                        fast_market_cap = 0
                    
                    if current_price > 0:
                        change = current_price - prev_close if prev_close else 0
                        change_pct = (change / prev_close * 100) if prev_close else 0
                        
                        # Get additional info for P/E and sector (use cache if available)
                        pe_ratio = 0
                        industry = stock['name'].split()[0]  # Default to first word of company name
                        market_cap = fast_market_cap
                        
                        try:
                            info = ticker.info
                            pe_ratio = info.get('trailingPE', 0) or info.get('forwardPE', 0) or 0
                            industry = info.get('industry', '') or info.get('sector', '') or industry
                            if market_cap == 0:
                                market_cap = info.get('marketCap', 0) or 0
                        except:
                            pass
                        
                        results.append({
                            "symbol": stock['display'],
                            "company": stock['name'],
                            "open": current_price,
                            "high": day_high,
                            "low": day_low,
                            "close": current_price,
                            "prev close": prev_close,
                            "%chng": round(change_pct, 2),
                            "change": round(change, 2),
                            "volume": volume,
                            "pe_ratio": round(pe_ratio, 2) if pe_ratio else 0,
                            "industry": industry,
                            "market_cap": market_cap,
                            "data_source": "yahoo_finance_realtime"
                        })
                except Exception as e:
                    logger.error(f"Error fetching {stock['display']}: {e}")
                    
        except Exception as e:
            logger.error(f"Batch download failed: {e}")
            # Fall back to individual requests
            for stock in NIFTY50_STOCKS[:10]:  # Limit to first 10 on fallback
                try:
                    ticker = yf.Ticker(stock['symbol'])
                    fast = ticker.fast_info
                    current_price = float(fast.last_price) if hasattr(fast, 'last_price') else 0
                    prev_close = float(fast.previous_close) if hasattr(fast, 'previous_close') else 0
                    
                    if current_price > 0:
                        change = current_price - prev_close if prev_close else 0
                        change_pct = (change / prev_close * 100) if prev_close else 0
                        
                        results.append({
                            "symbol": stock['display'],
                            "company": stock['name'],
                            "close": current_price,
                            "prev close": prev_close,
                            "%chng": round(change_pct, 2),
                            "change": round(change, 2),
                            "data_source": "yahoo_finance_realtime"
                        })
                except:
                    pass
        
        # Cache the results
        with _cache_lock:
            _screener_cache = results
            _screener_cache_time = datetime.now()
        
        logger.info(f"Screener returning {len(results)} stocks (cached for {_screener_cache_timeout}s)")
        return results
        
    except Exception as e:
        logger.error(f"Error in screener: {e}")
        return []


def get_historical_data(symbol, days=30):
    """Get historical candle data - OPTIMIZED with caching."""
    if not YFINANCE_AVAILABLE:
        return []
    
    cache_key = f"{symbol}_{days}"
    
    # Check cache
    with _cache_lock:
        if cache_key in _historical_cache:
            cached_data, cached_time = _historical_cache[cache_key]
            if _is_cache_valid(cached_time, _historical_cache_timeout):
                logger.info(f"Historical cache HIT for {symbol}")
                return cached_data
    
    try:
        yf_symbol = _get_yf_symbol(symbol)
        logger.info(f"Historical cache MISS - Fetching {days} days for {yf_symbol}")
        
        ticker = yf.Ticker(yf_symbol)
        
        # Use period instead of start/end for efficiency
        if days <= 5:
            period = "5d"
        elif days <= 30:
            period = "1mo"
        elif days <= 90:
            period = "3mo"
        elif days <= 180:
            period = "6mo"
        else:
            period = "1y"
        
        hist = ticker.history(period=period)
        
        if hist.empty:
            return []
        
        result = []
        for date, row in hist.iterrows():
            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': round(float(row['Open']), 2),
                'high': round(float(row['High']), 2),
                'low': round(float(row['Low']), 2),
                'close': round(float(row['Close']), 2),
                'volume': int(row['Volume'])
            })
        
        # Cache the results
        with _cache_lock:
            _historical_cache[cache_key] = (result, datetime.now())
        
        logger.info(f"Got {len(result)} historical records")
        return result
        
    except Exception as e:
        logger.error(f"Error getting historical data: {e}")
        return []


def get_top_performers(limit=10):
    """Get top performing stocks - Uses cached screener data."""
    try:
        all_stocks = screener()
        sorted_stocks = sorted(all_stocks, key=lambda x: x.get('%chng', 0), reverse=True)
        return sorted_stocks[:limit]
    except:
        return []


def get_market_summary():
    """Get market summary - Uses cached screener data."""
    try:
        all_stocks = screener()
        if not all_stocks:
            return {}
        
        advancing = sum(1 for s in all_stocks if s.get('%chng', 0) > 0)
        declining = sum(1 for s in all_stocks if s.get('%chng', 0) < 0)
        avg_change = sum(s.get('%chng', 0) for s in all_stocks) / len(all_stocks)
        
        return {
            'total_stocks': len(all_stocks),
            'advancing': advancing,
            'declining': declining,
            'avg_change': round(avg_change, 2),
            'data_source': 'yahoo_finance_realtime',
            'timestamp': datetime.now().isoformat()
        }
    except:
        return {}


def clear_cache():
    """Clear all caches to force refresh."""
    global _screener_cache, _screener_cache_time
    with _cache_lock:
        _company_cache.clear()
        _historical_cache.clear()
        _screener_cache = None
        _screener_cache_time = None
    logger.info("All caches cleared")


logger.info("Optimized Stock Service initialized with Yahoo Finance")
logger.info(f"yfinance available: {YFINANCE_AVAILABLE}")
logger.info(f"Cache timeouts - Company: {_company_cache_timeout}s, Screener: {_screener_cache_timeout}s, Historical: {_historical_cache_timeout}s")
