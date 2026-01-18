import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
from market_api import initialize_stock_database

def load_dataset():
    # Load the cleaned CSV file
    df = pd.read_csv("cleaned_nifty_500.csv")
    return df

# Initialize the stock database with CSV data
def init_stock_db():
    db = SessionLocal()
    try:
        initialize_stock_database(db)
        print("Stock database initialized successfully")
    finally:
        db.close()

# Test run
if __name__ == "__main__":
    data = load_dataset()
    print(data.head())
    print("\nRows:", len(data))
    
    # Initialize the stock database
    init_stock_db()

