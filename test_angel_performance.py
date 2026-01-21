import sys
import os
import time
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
print(f"Loading .env from {os.getcwd()}", flush=True)
load_dotenv()

print("Importing modules...", flush=True)
try:
    from angelone_service import get_equity_gainers_losers, get_stock_quote_angel
    print("Modules imported successfully.", flush=True)
except Exception as e:
    print(f"Import failed: {e}", flush=True)
    sys.exit(1)

# Debug Env
print("Checking credentials...", flush=True)
api_key = os.getenv("ANGELONE_API_KEY")
client_code = os.getenv("ANGELONE_CLIENT_CODE")
if not api_key:
    print("ERROR: ANGELONE_API_KEY is missing", flush=True)
else:
    print(f"ANGELONE_API_KEY is present (len={len(api_key)})", flush=True)

if not client_code:
    print("ERROR: ANGELONE_CLIENT_CODE is missing", flush=True)
else:
    print(f"ANGELONE_CLIENT_CODE is present: {client_code}", flush=True)


def test_gainers_losers():
    print("--------------------------------------------------", flush=True)
    print("Attempting initial login...", flush=True)
    from angelone_service import get_smart_api
    api = get_smart_api(force_fresh=True)
    if not api:
        print("CRITICAL: Initial login failed. The account might be rate-limited.", flush=True)
        return
    else:
        print("Initial login successful. Proceeding with load test.", flush=True)

    print(f"[{datetime.now()}] Starting Gainers/Losers Test...", flush=True)
    start_time = time.time()
    
    # This calls the throttled function
    try:
        result = get_equity_gainers_losers()
    except Exception as e:
        print(f"Error calling function: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return

    end_time = time.time()
    duration = end_time - start_time
    
    print(f"[{datetime.now()}] Completed in {duration:.2f} seconds", flush=True)
    print(f"Total Fetched: {result.get('total_fetched')}", flush=True)
    print(f"Gainers Found: {len(result.get('gainers', []))}", flush=True)
    print(f"Losers Found: {len(result.get('losers', []))}", flush=True)
    
    return result

if __name__ == "__main__":
    test_gainers_losers()
