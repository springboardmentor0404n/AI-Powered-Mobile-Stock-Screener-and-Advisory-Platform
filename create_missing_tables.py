"""
Create missing tables for portfolio and alerts functionality
"""
from database import execute, fetch_all

def create_tables():
    # Check existing tables
    existing = fetch_all(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    existing_tables = [t['tablename'] for t in existing]
    print(f"Existing tables: {existing_tables}")
    
    # Create portfolio_holdings table if not exists
    if 'portfolio_holdings' not in existing_tables:
        print("Creating portfolio_holdings table...")
        execute("""
            CREATE TABLE portfolio_holdings (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                symbol VARCHAR(50) NOT NULL,
                quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
                avg_buy_price DECIMAL(18, 4) NOT NULL DEFAULT 0,
                total_invested DECIMAL(18, 4) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, symbol)
            )
        """)
        print("✅ portfolio_holdings table created")
    else:
        print("✓ portfolio_holdings table already exists")
    
    # Create portfolio_transactions table if not exists
    if 'portfolio_transactions' not in existing_tables:
        print("Creating portfolio_transactions table...")
        execute("""
            CREATE TABLE portfolio_transactions (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                symbol VARCHAR(50) NOT NULL,
                transaction_type VARCHAR(10) NOT NULL,
                quantity DECIMAL(18, 4) NOT NULL,
                price DECIMAL(18, 4) NOT NULL,
                total_amount DECIMAL(18, 4) NOT NULL,
                notes TEXT,
                transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ portfolio_transactions table created")
    else:
        print("✓ portfolio_transactions table already exists")
    
    # Create stock_alerts table if not exists
    if 'stock_alerts' not in existing_tables:
        print("Creating stock_alerts table...")
        execute("""
            CREATE TABLE stock_alerts (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                symbol VARCHAR(50) NOT NULL,
                alert_type VARCHAR(50) NOT NULL,
                threshold DECIMAL(18, 4) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                triggered_at TIMESTAMP,
                triggered_price DECIMAL(18, 4)
            )
        """)
        print("✅ stock_alerts table created")
    else:
        print("✓ stock_alerts table already exists")
    
    # Verify tables were created
    final_tables = fetch_all(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    print(f"\nFinal tables: {[t['tablename'] for t in final_tables]}")

if __name__ == "__main__":
    create_tables()
