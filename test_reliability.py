import sys
import os
import asyncio
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

try:
    from yahoo_service import get_yahoo_quote
    from gemini_service import get_gemini_service
    from angelone_service import get_stock_quote_angel
    print("Modules imported successfully.")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)

async def test_yahoo_reliability():
    print("\n--- Testing Yahoo Reliability ---")
    # List of stocks that might have issues or different suffixes
    stocks = ["RELIANCE", "TCS", "HDFC.NSE", "INFY.BSE", "ZOMATO"]
    
    for symbol in stocks:
        try:
            exchange = "NSE"
            if "." in symbol:
                parts = symbol.split(".")
                s = parts[0]
                exchange = parts[1]
            else:
                s = symbol
            
            print(f"Fetching {s} on {exchange}...")
            quote = await get_yahoo_quote(s, exchange)
            
            if quote:
                price = quote.get('ltp', 0)
                if price > 0:
                    print(f"[PASS] Success: {s} = {price}")
                else:
                    print(f"[WARN] Warning: {s} returned 0 price")
            else:
                print(f"[FAIL] Failed: {s} returned None")
                
        except Exception as e:
            print(f"[FAIL] Exception for {symbol}: {e}")

async def test_gemini_reliability():
    print("\n--- Testing Gemini Reliability ---")
    service = get_gemini_service()
    
    try:
        response = service.chat("Explain the concept of 'Beta' in stocks briefly.")
        if response and len(response) > 50:
            print("[PASS] Gemini Response received successfully")
            print(f"Snippet: {response[:100]}...")
        else:
            print("[FAIL] Gemini returned empty or short response")
            
    except Exception as e:
        print(f"[FAIL] Gemini Exception: {e}")

async def test_angel_reliability():
    print("\n--- Testing Angel One Reliability ---")
    stocks = ["RELIANCE", "TCS", "INFY"]
    for symbol in stocks:
        try:
            print(f"Fetching {symbol} from Angel One...")
            quote = get_stock_quote_angel(symbol, "NSE")
            if quote:
                price = quote.get('ltp', 0)
                if price > 0:
                    print(f"[PASS] Angel One Success: {symbol} = {price}")
                else:
                    print(f"[WARN] Angel One returned 0 price for {symbol}")
            else:
                 print(f"[WARN] Angel One returned None for {symbol} (Possible fallback failure)")
        except Exception as e:
            print(f"[FAIL] Angel One Exception for {symbol}: {e}")

async def main():
    await test_yahoo_reliability()
    await test_gemini_reliability()
    await test_angel_reliability()

if __name__ == "__main__":
    asyncio.run(main())
