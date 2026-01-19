import pandas as pd
import logging
import os
import requests
from datetime import datetime
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY = os.getenv("API_KEY", "2Z2GLCU5ILOZUPV2")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

# Get the project root directory
BASE_DIR = Path(__file__).resolve().parent.parent
STOCK_DATA_DIR = BASE_DIR / "STOCK_DATA_CLEANING"

# Load data with error handling
try:
    market_file = STOCK_DATA_DIR / "nifty50_cleaned.csv"
    fund_file = STOCK_DATA_DIR / "fundamental_data.csv"
    
    logger.info(f"Loading market data from: {market_file}")
    logger.info(f"Loading fundamental data from: {fund_file}")
    
    if not market_file.exists():
        raise FileNotFoundError(f"Market data file not found: {market_file}")
    if not fund_file.exists():
        raise FileNotFoundError(f"Fundamental data file not found: {fund_file}")
    
    market = pd.read_csv(market_file)
    fund = pd.read_csv(fund_file)
    
    logger.info(f"Loaded {len(market)} market records")
    logger.info(f"Loaded {len(fund)} fundamental records")
    
    # Convert date to datetime for proper sorting
    market['date'] = pd.to_datetime(market['date'], format='%d-%m-%Y')
    
    # Use left merge to keep all market symbols, even those without fundamental data
    df = market.merge(fund, on="symbol", how="left")
    
    logger.info(f"Merged dataset has {len(df)} records")
    
except Exception as e:
    logger.error(f"Error loading stock data: {e}")
    # Create empty dataframes as fallback
    df = pd.DataFrame()

def get_company(symbol):
    """
    Get detailed information about a specific company by symbol.
    First tries to get live data from Yahoo Finance, then falls back to CSV.
    Always merges with fundamental data from CSV.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE', 'TCS')
        
    Returns:
        Dictionary with company data or None if not found
    """
    try:
        symbol = symbol.upper().strip()
        logger.info(f"Searching for company: {symbol}")
        
        # Get fundamental data from CSV first
        fundamental_data = {}
        if not df.empty:
            row = df[df["symbol"] == symbol]
            if not row.empty:
                latest = row.sort_values('date', ascending=False).iloc[0]
                fundamental_data = latest.to_dict()
                # Convert date back to string for JSON serialization
                if 'date' in fundamental_data and pd.notna(fundamental_data['date']):
                    fundamental_data['date'] = fundamental_data['date'].strftime('%d-%m-%Y')
                # Clean up NaN values
                fundamental_data = {k: (None if pd.isna(v) else v) for k, v in fundamental_data.items()}
        
        # Try to get live data
        live_data = get_live_quote(symbol)
        if live_data:
            # Merge live data with fundamental data (live data takes priority for price fields)
            result = {**fundamental_data, **live_data}
            logger.info(f"Found company with live data: {symbol}")
            return result
        
        # Fallback to CSV data only
        if fundamental_data:
            logger.info(f"Found company from CSV: {symbol}")
            return fundamental_data
        
        logger.warning(f"Company not found: {symbol}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting company {symbol}: {e}")
        return None


def get_live_quote(symbol):
    """
    Get live stock quote from Alpha Vantage.
    
    Args:
        symbol: Stock symbol
        
    Returns:
        Dictionary with live stock data or None
    """
    try:
        api_symbol = symbol.upper()
        # For Indian stocks, append .BSE (BSE) or .NSE (NSE)
        if not any(api_symbol.endswith(ext) for ext in ['.BSE', '.NSE']):
            api_symbol = f"{api_symbol}.BSE"
        
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": api_symbol,
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        
        logger.info(f"Fetching live quote for {api_symbol} from Alpha Vantage")
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            if "Global Quote" in data and data["Global Quote"]:
                quote = data["Global Quote"]
                
                current_price = float(quote.get("05. price", 0))
                previous_close = float(quote.get("08. previous close", 0))
                
                if current_price > 0:
                    change = float(quote.get("09. change", 0))
                    change_pct = float(quote.get("10. change percent", "0").replace("%", ""))
                    
                    result = {
                        "symbol": symbol.upper(),
                        "date": datetime.now().strftime('%d-%m-%Y'),
                        "open": float(quote.get("02. open", current_price)),
                        "high": float(quote.get("03. high", current_price)),
                        "low": float(quote.get("04. low", current_price)),
                        "close": current_price,
                        "last": current_price,
                        "prev close": previous_close,
                        "volume": int(quote.get("06. volume", 0)),
                        "vwap": current_price,  # Approximation
                        "turnover": float(int(quote.get("06. volume", 0)) * current_price),
                        "%chng": round(change_pct, 2),
                        "change": round(change, 2),
                        "52w high": current_price,  # Not available in GLOBAL_QUOTE
                        "52w low": current_price,   # Not available in GLOBAL_QUOTE
                        "data_source": "live"
                    }
                    
                    logger.info(f"Got live quote for {symbol}: ₹{current_price}")
                    return result
            
            # Check for API limit message
            if "Note" in data:
                logger.warning(f"Alpha Vantage API limit: {data['Note']}")
            if "Information" in data:
                logger.warning(f"Alpha Vantage: {data['Information']}")
        
        return None
        
    except Exception as e:
        logger.error(f"Error fetching live quote for {symbol}: {e}")
        return None


def screener():
    """
    Get a summary of all available stocks with their latest data.
    
    Returns:
        List of dictionaries with stock data
    """
    try:
        if df.empty:
            logger.error("No stock data available")
            return []
        
        import numpy as np
        
        # Get only the latest record for each symbol
        latest_data = df.sort_values('date', ascending=False).groupby('symbol').first().reset_index()
        
        # Calculate percentage change
        latest_data['%chng'] = ((latest_data['close'] - latest_data['prev close']) / latest_data['prev close'] * 100).round(2)
        
        # Calculate market cap (using turnover as proxy or a calculation)
        # For actual market cap, we'd need shares outstanding
        # Using turnover * 365 as a rough proxy for market activity
        latest_data['market cap'] = latest_data['turnover'] * 365
        
        # Add company name (using symbol as fallback since we don't have company names in data)
        latest_data['company'] = latest_data['symbol']
        
        # Replace NaN and Inf with None for JSON serialization
        latest_data = latest_data.replace([np.inf, -np.inf], np.nan)
        latest_data = latest_data.where(pd.notna(latest_data), None)
        
        result = latest_data.to_dict(orient="records")
        
        # Convert dates to strings and clean up any remaining non-serializable values
        for record in result:
            if 'date' in record and record['date']:
                try:
                    record['date'] = pd.to_datetime(record['date']).strftime('%d-%m-%Y')
                except:
                    record['date'] = None
            
            # Extra safety: ensure all float values are valid
            for key, value in list(record.items()):
                if isinstance(value, float):
                    if not np.isfinite(value):
                        record[key] = None
        
        logger.info(f"Screener returning {len(result)} stocks")
        return result
        
    except Exception as e:
        logger.error(f"Error in screener: {e}")
        return []

def get_top_performers(limit=10):
    """
    Get top performing stocks by growth percentage.
    
    Args:
        limit: Number of top performers to return
        
    Returns:
        List of top performing stocks
    """
    try:
        if df.empty:
            return []
        
        latest_data = df.sort_values('date', ascending=False).groupby('symbol').first().reset_index()
        
        # Calculate growth
        latest_data['growth'] = (
            (latest_data['close'] - latest_data['prev close']) / latest_data['prev close']
        ) * 100
        
        # Sort by growth and return top performers
        top = latest_data.nlargest(limit, 'growth')
        return top.to_dict('records')
        
    except Exception as e:
        logger.error(f"Error getting top performers: {e}")
        return []

def get_historical_data(symbol, days=30):
    """
    Get historical OHLCV data for a symbol from Yahoo Finance (live data).
    
    Args:
        symbol: Stock symbol
        days: Number of days of historical data to retrieve
        
    Returns:
        List of dictionaries with date, open, high, low, close, volume
    """
    try:
        symbol = symbol.upper().strip()
        logger.info(f"Getting historical data for: {symbol}, days: {days}")
        
        # Try to get live data from Yahoo Finance first
        live_data = get_live_historical_data(symbol, days)
        if live_data:
            return live_data
        
        # Fallback to CSV data if API fails
        logger.warning(f"Falling back to CSV data for {symbol}")
        if df.empty:
            logger.error("No stock data available")
            return []
        
        # Get data for this symbol
        symbol_data = df[df["symbol"] == symbol].copy()
        
        if symbol_data.empty:
            logger.warning(f"No data found for symbol: {symbol}")
            return []
        
        # Sort by date descending and get last N days
        symbol_data = symbol_data.sort_values('date', ascending=False).head(days)
        
        # Sort ascending for chart display
        symbol_data = symbol_data.sort_values('date', ascending=True)
        
        result = []
        for _, row in symbol_data.iterrows():
            result.append({
                'date': row['date'].strftime('%Y-%m-%d') if pd.notna(row['date']) else None,
                'open': float(row['open']) if pd.notna(row['open']) else None,
                'high': float(row['high']) if pd.notna(row['high']) else None,
                'low': float(row['low']) if pd.notna(row['low']) else None,
                'close': float(row['close']) if pd.notna(row['close']) else None,
                'volume': int(row['volume']) if pd.notna(row['volume']) else 0
            })
        
        logger.info(f"Returning {len(result)} historical records for {symbol}")
        return result
        
    except Exception as e:
        logger.error(f"Error getting historical data for {symbol}: {e}")
        return []


def get_live_historical_data(symbol, days=30):
    """
    Get live historical data from Alpha Vantage.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE', 'TCS')
        days: Number of days of data
        
    Returns:
        List of OHLCV data or None if failed
    """
    try:
        # For Indian stocks, append .BSE
        api_symbol = symbol.upper()
        if not any(api_symbol.endswith(ext) for ext in ['.BSE', '.NSE']):
            api_symbol = f"{api_symbol}.BSE"
        
        # Use TIME_SERIES_DAILY for daily data
        params = {
            "function": "TIME_SERIES_DAILY",
            "symbol": api_symbol,
            "outputsize": "compact" if days <= 100 else "full",
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        
        logger.info(f"Fetching historical data for {api_symbol} from Alpha Vantage")
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            if "Time Series (Daily)" in data:
                time_series = data["Time Series (Daily)"]
                
                result = []
                for date_str, values in sorted(time_series.items()):
                    result.append({
                        'date': date_str,
                        'open': float(values.get("1. open", 0)),
                        'high': float(values.get("2. high", 0)),
                        'low': float(values.get("3. low", 0)),
                        'close': float(values.get("4. close", 0)),
                        'volume': int(values.get("5. volume", 0))
                    })
                
                # Return only the requested number of days (most recent)
                if len(result) > days:
                    result = result[-days:]
                
                logger.info(f"Got {len(result)} historical records for {symbol} from Alpha Vantage")
                return result
            
            # Check for API limit or error messages
            if "Note" in data:
                logger.warning(f"Alpha Vantage API limit: {data['Note']}")
            if "Information" in data:
                logger.warning(f"Alpha Vantage: {data['Information']}")
            if "Error Message" in data:
                logger.warning(f"Alpha Vantage Error: {data['Error Message']}")
        
        return None
        
    except Exception as e:
        logger.error(f"Error fetching live historical data: {e}")
        return None

def get_market_summary():
    """
    Get overall market summary statistics.
    
    Returns:
        Dictionary with market summary
    """
    try:
        if df.empty:
            return {}
        
        latest_data = df.sort_values('date', ascending=False).groupby('symbol').first().reset_index()
        
        summary = {
            'total_stocks': len(latest_data),
            'avg_price': float(latest_data['close'].mean()),
            'total_volume': float(latest_data['volume'].sum()),
            'avg_pe_ratio': float(latest_data['pe_ratio'].mean()),
            'advancing': len(latest_data[latest_data['close'] > latest_data['prev close']]),
            'declining': len(latest_data[latest_data['close'] < latest_data['prev close']])
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting market summary: {e}")
        return {}

