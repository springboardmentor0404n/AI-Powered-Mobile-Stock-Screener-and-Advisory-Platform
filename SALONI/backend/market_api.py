import requests
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime
from stock_models import Stock
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Alpha Vantage API configuration
ALPHA_VANTAGE_API_KEY = "W3QXVZCZJKW5U9D4"  # Replace with your actual API key
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

def fetch_stock_data(symbol: str):
    """
    Fetch real-time stock data for a given symbol from Alpha Vantage
    """
    try:
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol,
            'apikey': ALPHA_VANTAGE_API_KEY
        }
        
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params)
        data = response.json()
        
        # Check if we got valid data
        if 'Global Quote' in data:
            quote = data['Global Quote']
            return {
                'symbol': quote.get('01. symbol', symbol),
                'price': float(quote.get('05. price', 0)),
                'open': float(quote.get('02. open', 0)),
                'high': float(quote.get('03. high', 0)),
                'low': float(quote.get('04. low', 0)),
                'volume': int(float(quote.get('06. volume', 0))),
                'previous_close': float(quote.get('08. previous close', 0)),
                'change': float(quote.get('09. change', 0)),
                'change_percent': quote.get('10. change percent', '0%'),
                'last_updated': datetime.now()
            }
        else:
            logger.error(f"No data found for symbol {symbol}: {data}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return None

def update_stock_prices(db: Session):
    """
    Update all stocks in the database with real-time prices
    """
    try:
        # Get all stocks from the database
        stocks = db.query(Stock).all()
        
        updated_count = 0
        
        for stock in stocks:
            # Fetch real-time data for the stock
            data = fetch_stock_data(stock.symbol)
            
            if data:
                # Update the stock record with real-time data
                stock.current_price = data['price']
                stock.daily_high = data['high']
                stock.daily_low = data['low']
                stock.volume = data['volume']
                stock.last_updated = data['last_updated']
                
                updated_count += 1
                logger.info(f"Updated {stock.symbol}: Price={data['price']}")
        
        # Commit all changes to the database
        db.commit()
        logger.info(f"Successfully updated {updated_count} stocks")
        
        return updated_count
        
    except Exception as e:
        logger.error(f"Error updating stock prices: {str(e)}")
        db.rollback()
        return 0

def initialize_stock_database(db: Session):
    """
    Initialize the stock database with data from the CSV file
    """
    try:
        # Load the CSV data
        df = pd.read_csv("cleaned_nifty_500.csv")
        
        # Process each row in the CSV
        for index, row in df.iterrows():
            # Check if the stock already exists in the database
            existing_stock = db.query(Stock).filter(Stock.symbol == row['symbol']).first()
            
            if not existing_stock:
                # Create a new stock record
                new_stock = Stock(
                    symbol=row['symbol'],
                    company_name=row.get('company', ''),
                    industry=row.get('industry', ''),
                    category=row.get('category', ''),
                    market_cap=row.get('market_cap', ''),
                    current_value=row.get('current_value', 0.0)
                )
                
                db.add(new_stock)
        
        # Commit the changes
        db.commit()
        logger.info(f"Initialized stock database with {len(df)} stocks from CSV")
        
    except Exception as e:
        logger.error(f"Error initializing stock database: {str(e)}")
        db.rollback()

# Example function to test the API integration
def test_api_connection():
    """
    Test function to verify the API connection works
    """
    test_symbol = "RELIANCE.BSE"  # Example symbol
    data = fetch_stock_data(test_symbol)
    
    if data:
        print(f"Successfully fetched data for {test_symbol}")
        print(f"Price: {data['price']}")
        print(f"High: {data['high']}")
        print(f"Low: {data['low']}")
        return True
    else:
        print(f"Failed to fetch data for {test_symbol}")
        return False