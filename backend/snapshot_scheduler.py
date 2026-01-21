"""
Snapshot Scheduler Service
Schedules daily market data snapshots to pre-warm the cache and capture end-of-day data.
"""
import schedule
import time
import threading
import asyncio
from datetime import datetime
from market_cache import market_data_cache

def run_pre_market_snapshot():
    """Run snapshot at 9:00 AM to pre-warm cache for the day"""
    print(f"[SCHEDULER] 🌅 Running Pre-Market Cache Warming: {datetime.now()}")
    asyncio.run(market_data_cache.create_daily_snapshot())

def run_closing_snapshot():
    """Run snapshot at 3:45 PM to capture closing data"""
    print(f"[SCHEDULER] 🌇 Running EOD Market Snapshot: {datetime.now()}")
    asyncio.run(market_data_cache.create_daily_snapshot())

def start_scheduler():
    """Start the scheduler thread"""
    # Schedule morning cache warming
    schedule.every().day.at("09:00").do(run_pre_market_snapshot)
    
    # Schedule evening closing snapshot
    schedule.every().day.at("15:45").do(run_closing_snapshot)
    
    print("[SCHEDULER] ✅ Market Data Scheduler Started (09:00 AM & 03:45 PM)")
    
    def run_loop():
        while True:
            schedule.run_pending()
            time.sleep(60)

    thread = threading.Thread(target=run_loop, daemon=True)
    thread.start()

if __name__ == "__main__":
    start_scheduler()
    # Keep main thread alive if run directly
    while True:
        time.sleep(1)
