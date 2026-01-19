"""
Add portfolio tables to existing database.
Run this script to add portfolio tracking functionality.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error("DATABASE_URL not set in environment variables")
    exit(1)

logger.info("Connecting to database...")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# SQL statements to create portfolio tables
CREATE_PORTFOLIO_TABLES = """
-- Portfolio holdings table (current positions)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 0,
    avg_buy_price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    total_invested DECIMAL(15, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    UNIQUE(user_email, symbol)
);

-- Portfolio transactions table (buy/sell history)
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity DECIMAL(15, 4) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    total_amount DECIMAL(15, 4) NOT NULL,
    notes TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create indexes for portfolio tables
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_email ON portfolio_holdings(user_email);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_email ON portfolio_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date DESC);
"""

def add_portfolio_tables():
    """Add portfolio tables to the database."""
    try:
        logger.info("Adding portfolio tables...")
        
        with engine.begin() as conn:
            conn.execute(text(CREATE_PORTFOLIO_TABLES))
        
        logger.info("✓ Portfolio holdings table created!")
        logger.info("✓ Portfolio transactions table created!")
        logger.info("✓ Indexes created!")
        logger.info("")
        logger.info("Portfolio tables added successfully!")
        
    except Exception as e:
        logger.error(f"Error adding portfolio tables: {e}")
        raise

if __name__ == "__main__":
    add_portfolio_tables()
