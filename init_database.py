"""
Database initialization script.
Run this script to create all necessary tables for the application.
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

logger.info(f"Connecting to database...")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# SQL statements to create tables
CREATE_TABLES = """
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pending users table (for registration flow)
CREATE TABLE IF NOT EXISTS pending_user (
    email VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP table (for email verification)
CREATE TABLE IF NOT EXISTS otp (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock embeddings table (for AI chatbot)
CREATE TABLE IF NOT EXISTS stock_embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding FLOAT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table (for user stock watchlists)
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    UNIQUE(user_email, symbol)
);

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

-- Stock alerts table (for price/change notifications)
CREATE TABLE IF NOT EXISTS stock_alerts (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'change_up', 'change_down')),
    threshold DECIMAL(15, 4) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP,
    triggered_price DECIMAL(15, 4),
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_stock_embeddings_created ON stock_embeddings(created_at);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_email ON watchlist(user_email);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_email ON portfolio_holdings(user_email);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_email ON portfolio_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user_email ON stock_alerts(user_email);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_symbol ON stock_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(is_active) WHERE is_active = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
"""

def init_database():
    """Initialize the database with all required tables."""
    try:
        logger.info("Starting database initialization...")
        
        with engine.begin() as conn:
            # Execute all CREATE TABLE statements
            conn.execute(text(CREATE_TABLES))
        
        logger.info("✓ Database tables created successfully!")
        logger.info("✓ Indexes created successfully!")
        logger.info("✓ Triggers created successfully!")
        logger.info("")
        logger.info("Database initialization complete!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Run 'python seed_embeddings.py' to populate stock embeddings for the chatbot")
        logger.info("2. Start the application with 'uvicorn main:app --reload'")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

if __name__ == "__main__":
    init_database()
