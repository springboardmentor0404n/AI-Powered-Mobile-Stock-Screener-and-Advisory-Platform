from database import fetch_all

# Check table structure
print("=== Current Table Structure ===")
for table in ['users', 'pending_user', 'otp']:
    cols = fetch_all(f"""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '{table}'
        ORDER BY ordinal_position
    """)
    print(f"\n{table}:")
    for c in cols:
        print(f"  - {c['column_name']}: {c['data_type']}")

# Check data counts
print("\n=== Data Counts ===")
try:
    pending = fetch_all("SELECT * FROM pending_user")
    print(f"pending_user: {len(pending)} rows")
    for p in pending:
        print(f"  {dict(p)}")
except Exception as e:
    print(f"pending_user error: {e}")

try:
    users = fetch_all("SELECT * FROM users")
    print(f"users: {len(users)} rows")
    for u in users:
        print(f"  {dict(u)}")
except Exception as e:
    print(f"users error: {e}")
