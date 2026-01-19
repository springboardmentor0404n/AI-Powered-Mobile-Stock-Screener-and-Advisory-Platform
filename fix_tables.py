from database import execute, fetch_all

print("=== Fixing Database Tables ===")

# Drop existing tables in correct order (respecting foreign keys)
tables_to_drop = [
    'stock_alerts',
    'portfolio_transactions', 
    'portfolio_holdings',
    'watchlist',
    'stock_embeddings',
    'otp',
    'pending_user',
    'users'
]

for table in tables_to_drop:
    try:
        execute(f"DROP TABLE IF EXISTS {table} CASCADE")
        print(f"Dropped: {table}")
    except Exception as e:
        print(f"Error dropping {table}: {e}")

print("\n=== Creating Tables ===")

# Create users table
execute("""
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("Created: users")

# Create pending_user table
execute("""
    CREATE TABLE pending_user (
        email VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("Created: pending_user")

# Create OTP table
execute("""
    CREATE TABLE otp (
        email VARCHAR(255) PRIMARY KEY,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("Created: otp")

# Create indexes
execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
print("Created indexes")

print("\n=== Verification ===")
for table in ['users', 'pending_user', 'otp']:
    cols = fetch_all(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '{table}'
        ORDER BY ordinal_position
    """)
    print(f"{table}: {[c['column_name'] for c in cols]}")

print("\n✓ Database tables fixed successfully!")
