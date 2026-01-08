import os
import requests
import pandas as pd
from flask import Blueprint, jsonify, request
from dotenv import load_dotenv
from datetime import datetime, timedelta
import numpy as np

# Load environment variables from .env
load_dotenv()

analytics_bp = Blueprint("analytics", __name__)

# Constants
DATA_DIR = "app/data/uploads"
MARKET_API_KEY = os.getenv("MARKET_API_KEY")
MARKETSTACK_BASE_URL = "http://api.marketstack.com/v1/eod"

# --- HELPER FUNCTIONS ---

def get_marketstack_symbol(symbol):
    """Convert symbol to Marketstack format (defaults to NSE)"""
    clean = symbol.replace('.XNSE', '').replace('.NS', '').replace('.NSE', '').replace('.BSE', '')
    return f"{clean}.XNSE"

def clean_symbol_from_file(filename):
    """Extract symbol from cleaned filename"""
    if filename.startswith('cleaned_'):
        symbol = filename[8:]  # Remove 'cleaned_'
    else:
        symbol = filename
    
    if symbol.endswith('.csv'):
        symbol = symbol[:-4]  # Remove '.csv'
    
    return symbol.upper()

def get_market_status():
    """Check if market is open/closed with detailed info"""
    now = datetime.now()
    is_weekend = now.weekday() >= 5
    
    # Market hours
    market_start = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_end = now.replace(hour=15, minute=30, second=0, microsecond=0)
    
    is_open = False
    if not is_weekend and market_start <= now <= market_end:
        is_open = True
    
    next_open_date = now
    if is_weekend:
        # Next Monday
        days_until_monday = (7 - now.weekday()) % 7
        next_open_date = now + timedelta(days=days_until_monday)
    elif now > market_end:
        # Tomorrow if weekday
        next_open_date = now + timedelta(days=1)
        if next_open_date.weekday() >= 5:
            # Skip to Monday
            days_until_monday = (7 - next_open_date.weekday()) % 7
            next_open_date += timedelta(days=days_until_monday)
    
    next_open_time = next_open_date.replace(hour=9, minute=15, second=0, microsecond=0)
    
    return {
        "isOpen": is_open,
        "isWeekend": is_weekend,
        "currentTime": now.isoformat(),
        "marketHours": {
            "start": "09:15",
            "end": "15:30"
        },
        "nextOpen": next_open_time.isoformat(),
        "closeTime": "15:30",
        "status": "open" if is_open else "closed"
    }

def fetch_marketstack_data(symbol, date_from=None, date_to=None, limit=100):
    """Generic MarketStack API fetcher"""
    if not MARKET_API_KEY:
        return None
    
    try:
        ms_symbol = get_marketstack_symbol(symbol)
        params = {
            "access_key": MARKET_API_KEY,
            "symbols": ms_symbol,
            "sort": "ASC",
            "limit": limit
        }
        
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to
        
        response = requests.get(MARKETSTACK_BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"MarketStack API Error: {e}")
        return None

def process_api_data(api_response):
    """Process MarketStack API response into standardized format"""
    if not api_response or "data" not in api_response:
        return []
    
    formatted_data = []
    for item in api_response["data"]:
        if item:
            formatted_data.append({
                "date": item.get("date", "")[:10],
                "time": item.get("date", "")[:10],  # Added time field
                "open": round(float(item.get("open") or 0), 2),
                "high": round(float(item.get("high") or 0), 2),
                "low": round(float(item.get("low") or 0), 2),
                "close": round(float(item.get("close") or 0), 2),
                "volume": int(item.get("volume") or 0),
                "source": "API"
            })
    return formatted_data

def get_csv_data(symbol, start_date=None, end_date=None):
    """Get data from CSV with optional date filtering"""
    csv_path = os.path.join(DATA_DIR, f"cleaned_{symbol.lower()}.csv")
    if not os.path.exists(csv_path):
        return []
    
    try:
        df = pd.read_csv(csv_path)
        
        # Check if required columns exist
        if 'date' not in df.columns or 'close' not in df.columns:
            print(f"Required columns missing in {csv_path}")
            return []
        
        df['date'] = pd.to_datetime(df['date'])
        
        if start_date:
            start_ts = pd.Timestamp(start_date)
            df = df[df['date'] >= start_ts]
        if end_date:
            end_ts = pd.Timestamp(end_date)
            df = df[df['date'] <= end_ts]
        
        df = df.sort_values('date')
        formatted_data = []
        for _, row in df.iterrows():
            formatted_data.append({
                "date": row['date'].strftime('%Y-%m-%d'),
                "time": row['date'].strftime('%Y-%m-%d'),  # Added time field
                "open": round(float(row.get('open', row['close'])), 2),
                "high": round(float(row.get('high', row['close'])), 2),
                "low": round(float(row.get('low', row['close'])), 2),
                "close": round(float(row['close']), 2),
                "volume": int(row.get('volume', 0)),
                "source": "CSV"
            })
        return formatted_data
    except Exception as e:
        print(f"CSV Read Error for {symbol}: {e}")
        return []

# --- NEW ENDPOINTS FOR FRONTEND ---

@analytics_bp.route("/analytics/marketstack/<symbol>", methods=["GET"])
def get_marketstack_year_data(symbol):
    """Get MarketStack data for specific year (2022-2026)"""
    try:
        clean_sym = symbol.strip().upper()
        year = request.args.get('year', 2026, type=int)
        
        # Validate year (only 2022-2026 for API)
        if year < 2022 or year > 2026:
            return jsonify({
                "symbol": clean_sym,
                "year": year,
                "data": [],
                "message": "MarketStack API only supports 2022-2026. Use CSV for earlier years."
            }), 200
        
        # Set date range for the entire year
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31)
        
        # Fetch from MarketStack
        api_response = fetch_marketstack_data(
            clean_sym, 
            date_from=start_date.strftime("%Y-%m-%d"),
            date_to=end_date.strftime("%Y-%m-%d"),
            limit=365
        )
        
        data = process_api_data(api_response)
        
        return jsonify({
            "symbol": clean_sym,
            "year": year,
            "data": data,
            "count": len(data),
            "source": "marketstack_api"
        })
        
    except Exception as e:
        print(f"MarketStack year data error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/csv-history/<symbol>", methods=["GET"])
def get_csv_history(symbol):
    """Get all CSV historical data (up to 2021)"""
    try:
        clean_sym = symbol.strip().upper()
        data = get_csv_data(clean_sym)
        
        # Filter for years <= 2021 (CSV historical data)
        csv_data = []
        for item in data:
            item_year = int(item['date'][:4])
            if item_year <= 2021:
                csv_data.append(item)
        
        # Sort by date (oldest first)
        csv_data.sort(key=lambda x: x['date'])
        
        return jsonify({
            "symbol": clean_sym,
            "data": csv_data,
            "count": len(csv_data),
            "source": "csv_history",
            "years_available": sorted(list(set([d['date'][:4] for d in csv_data])))
        })
        
    except Exception as e:
        print(f"CSV history error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/market-status", methods=["GET"])
def market_status():
    """Get current market status"""
    try:
        status = get_market_status()
        return jsonify(status)
    except Exception as e:
        print(f"Market status error: {e}")
        return jsonify({
            "isOpen": False,
            "status": "unknown",
            "currentTime": datetime.now().isoformat()
        }), 500

@analytics_bp.route("/analytics/combined-data/<symbol>", methods=["GET"])
def get_combined_data(symbol):
    """Get combined CSV + API data for specific year"""
    try:
        clean_sym = symbol.strip().upper()
        year = request.args.get('year', 2026, type=int)
        source = request.args.get('source', 'MIXED')  # CSV, API, or MIXED
        
        all_data = []
        
        # Get CSV data for years <= 2021
        if source in ['CSV', 'MIXED'] and year <= 2021:
            csv_data = get_csv_data(clean_sym)
            for item in csv_data:
                item_year = int(item['date'][:4])
                if item_year == year:
                    all_data.append(item)
        
        # Get API data for years >= 2022
        if source in ['API', 'MIXED'] and year >= 2022 and year <= 2026:
            api_response = fetch_marketstack_data(
                clean_sym,
                date_from=f"{year}-01-01",
                date_to=f"{year}-12-31",
                limit=365
            )
            api_data = process_api_data(api_response)
            all_data.extend(api_data)
        
        # Sort by date
        all_data.sort(key=lambda x: x['date'])
        
        return jsonify({
            "symbol": clean_sym,
            "year": year,
            "data": all_data,
            "count": len(all_data),
            "sources": list(set([d['source'] for d in all_data])),
            "date_range": {
                "start": all_data[0]['date'] if all_data else None,
                "end": all_data[-1]['date'] if all_data else None
            }
        })
        
    except Exception as e:
        print(f"Combined data error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/quarter-stats/<symbol>", methods=["GET"])
def get_quarter_stats(symbol):
    """Get detailed statistics for a specific quarter"""
    try:
        clean_sym = symbol.strip().upper()
        year = request.args.get('year', 2026, type=int)
        quarter = request.args.get('quarter', 0, type=int)  # 0-3 for Q1-Q4
        
        # Quarter date ranges
        quarter_months = {
            0: (1, 3),   # Q1: Jan-Mar
            1: (4, 6),   # Q2: Apr-Jun
            2: (7, 9),   # Q3: Jul-Sep
            3: (10, 12)  # Q4: Oct-Dec
        }
        
        if quarter not in quarter_months:
            return jsonify({"error": "Invalid quarter (0-3 only)"}), 400
        
        start_month, end_month = quarter_months[quarter]
        start_date = datetime(year, start_month, 1)
        
        # Calculate end date (last day of end month)
        if end_month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(year, end_month + 1, 1) - timedelta(seconds=1)
        
        # Get data for the quarter
        data = []
        if year >= 2022 and year <= 2026:
            # Use API for 2022-2026
            api_response = fetch_marketstack_data(
                clean_sym,
                date_from=start_date.strftime("%Y-%m-%d"),
                date_to=end_date.strftime("%Y-%m-%d"),
                limit=100
            )
            data = process_api_data(api_response)
        else:
            # Use CSV for earlier years
            csv_all = get_csv_data(clean_sym)
            for item in csv_all:
                item_date = datetime.strptime(item['date'], '%Y-%m-%d')
                if start_date <= item_date <= end_date:
                    data.append(item)
        
        if not data:
            return jsonify({
                "symbol": clean_sym,
                "year": year,
                "quarter": quarter,
                "stats": {},
                "message": "No data available for this quarter"
            }), 200
        
        # Calculate statistics
        closes = [d['close'] for d in data]
        volumes = [d['volume'] for d in data]
        highs = [d['high'] for d in data]
        lows = [d['low'] for d in data]
        
        start_close = closes[0] if closes else 0
        end_close = closes[-1] if closes else 0
        change = end_close - start_close
        percent_change = (change / start_close * 100) if start_close else 0
        
        # Volatility calculation
        returns = []
        for i in range(1, len(closes)):
            if closes[i-1] > 0:
                daily_return = (closes[i] - closes[i-1]) / closes[i-1]
                returns.append(daily_return)
        
        volatility = np.std(returns) * np.sqrt(len(data)) * 100 if returns else 0
        
        stats = {
            "startDate": data[0]['date'],
            "endDate": data[-1]['date'],
            "tradingDays": len(data),
            "startPrice": round(start_close, 2),
            "endPrice": round(end_close, 2),
            "periodChange": round(change, 2),
            "percentChange": round(percent_change, 2),
            "isPositive": change >= 0,
            "high": round(max(highs), 2),
            "low": round(min(lows), 2),
            "average": round(np.mean(closes), 2),
            "median": round(np.median(closes), 2),
            "volatility": round(volatility, 2),
            "totalVolume": sum(volumes),
            "avgVolume": round(np.mean(volumes), 2),
            "maxVolume": max(volumes),
            "source": data[0]['source'] if data else "unknown"
        }
        
        return jsonify({
            "symbol": clean_sym,
            "year": year,
            "quarter": quarter,
            "quarterLabel": f"Q{quarter+1} {year}",
            "stats": stats,
            "dataPoints": len(data)
        })
        
    except Exception as e:
        print(f"Quarter stats error: {e}")
        return jsonify({"error": str(e)}), 500

# --- EXISTING ROUTES (COMPLETED) ---

@analytics_bp.route("/analytics/quarter-data/<symbol>", methods=["GET"])
def get_quarter_data(symbol):
    """Get stock data for specific quarter (existing route with improvements)"""
    try:
        clean_sym = symbol.strip().upper()
        quarter = request.args.get('quarter', 0, type=int)
        year = request.args.get('year', 2026, type=int)
        
        # Quarter date ranges
        quarter_months = {
            0: (1, 3),   # Q1
            1: (4, 6),   # Q2
            2: (7, 9),   # Q3
            3: (10, 12)  # Q4
        }
        
        if quarter not in quarter_months:
            return jsonify({"error": "Invalid quarter (0-3 only)"}), 400
        
        start_month, end_month = quarter_months[quarter]
        start_date = datetime(year, start_month, 1)
        
        if end_month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(year, end_month + 1, 1) - timedelta(seconds=1)
        
        # Try API first for 2022-2026
        data = []
        source = "unknown"
        
        if year >= 2022 and year <= 2026:
            api_response = fetch_marketstack_data(
                clean_sym,
                date_from=start_date.strftime("%Y-%m-%d"),
                date_to=end_date.strftime("%Y-%m-%d"),
                limit=100
            )
            data = process_api_data(api_response)
            if data:
                source = "marketstack_api"
        
        # Fallback to CSV (for 2021 and earlier, or if API fails)
        if not data and year <= 2021:
            csv_all = get_csv_data(clean_sym)
            for item in csv_all:
                item_date = datetime.strptime(item['date'], '%Y-%m-%d')
                if start_date <= item_date <= end_date:
                    data.append(item)
            if data:
                source = "csv_fallback"
        
        return jsonify({
            "symbol": clean_sym,
            "year": year,
            "quarter": quarter,
            "data": data,
            "source": source,
            "count": len(data),
            "dateRange": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d")
            }
        })
        
    except Exception as e:
        print(f"Quarter data error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/today-stock/<symbol>", methods=["GET"])
def get_today_stock(symbol):
    """Fetch today's data + last 30 days history - FIXED VERSION"""
    try:
        clean_sym = symbol.strip().upper()
        market_status = get_market_status()
        
        response_data = {
            "symbol": clean_sym,
            "market_status": market_status,
            "last_updated": datetime.now().isoformat(),
            "today_data": {},
            "history_data": []
        }
        
        # Try API first
        api_response = fetch_marketstack_data(clean_sym, limit=31)
        if api_response and "data" in api_response:
            history_data = []
            api_data = api_response.get("data", [])
            
            # Process API data - MarketStack returns latest first
            for item in api_data:
                if item and item.get("date"):
                    history_data.append({
                        "date": item.get("date", "")[:10],
                        "time": item.get("date", "")[:10],  # Added time field
                        "open": round(float(item.get("open") or 0), 2),
                        "high": round(float(item.get("high") or 0), 2),
                        "low": round(float(item.get("low") or 0), 2),
                        "close": round(float(item.get("close") or 0), 2),
                        "volume": int(item.get("volume") or 0),
                        "source": "API"
                    })
            
            # MarketStack returns newest to oldest, reverse to chronological
            history_data.reverse()
            
            # Add change calculations
            for i in range(len(history_data)):
                if i > 0:  # Skip first (oldest) record
                    prev_close = history_data[i-1]["close"]
                    current_close = history_data[i]["close"]
                    history_data[i]["change"] = current_close - prev_close
                    history_data[i]["percent_change"] = ((current_close - prev_close) / prev_close * 100) if prev_close else 0
                else:
                    history_data[i]["change"] = 0
                    history_data[i]["percent_change"] = 0
            
            # Get latest (today's) data - last item after reversal
            if history_data:
                latest = history_data[-1]
                prev_close = history_data[-2]["close"] if len(history_data) > 1 else latest["close"]
                
                response_data.update({
                    "today_data": {
                        "current_price": latest["close"],
                        "open_price": latest["open"],
                        "day_high": latest["high"],
                        "day_low": latest["low"],
                        "volume": latest["volume"],
                        "change": latest["change"],
                        "percent_change": latest["percent_change"],
                        "previous_close": prev_close,
                        "data_source": "marketstack_api"
                    },
                    "history_data": history_data,
                    "data_source": "marketstack_api"
                })
            return jsonify(response_data)
        
        # CSV Fallback
        csv_data = get_csv_data(clean_sym)
        if csv_data:
            # Get last 31 days from CSV - CSV is already chronological
            recent_data = csv_data[-31:] if len(csv_data) >= 31 else csv_data
            
            # Ensure time field exists for frontend compatibility
            for item in recent_data:
                if "time" not in item:
                    item["time"] = item["date"]
            
            # Add change calculations
            for i in range(len(recent_data)):
                if i > 0:
                    prev_close = recent_data[i-1]["close"]
                    current_close = recent_data[i]["close"]
                    recent_data[i]["change"] = current_close - prev_close
                    recent_data[i]["percent_change"] = ((current_close - prev_close) / prev_close * 100) if prev_close else 0
                else:
                    recent_data[i]["change"] = 0
                    recent_data[i]["percent_change"] = 0
            
            if recent_data:
                latest = recent_data[-1]
                prev_close = recent_data[-2]["close"] if len(recent_data) > 1 else latest["close"]
                
                response_data.update({
                    "today_data": {
                        "current_price": latest["close"],
                        "open_price": latest["open"],
                        "day_high": latest["high"],
                        "day_low": latest["low"],
                        "volume": latest["volume"],
                        "change": latest["change"],
                        "percent_change": latest["percent_change"],
                        "previous_close": prev_close,
                        "data_source": "csv_fallback"
                    },
                    "history_data": recent_data,
                    "data_source": "csv_fallback"
                })
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Today stock error: {e}")
        return jsonify({"error": str(e)}), 500

# --- COMPLETE THE MISSING ROUTES ---

@analytics_bp.route("/analytics/stock-analysis/<symbol>", methods=["GET"])
def get_stock_analysis(symbol):
    """Get stock analysis data for dashboard"""
    try:
        clean_sym = symbol.strip().upper()
        
        # Get API data for recent trend
        api_trend = []
        if MARKET_API_KEY:
            try:
                api_response = fetch_marketstack_data(clean_sym, limit=30)
                if api_response and "data" in api_response:
                    api_trend = [{
                        "time": item.get("date", "")[:10],
                        "close": round(float(item.get("close") or 0), 2),
                        "open": round(float(item.get("open") or 0), 2),
                        "high": round(float(item.get("high") or 0), 2),
                        "low": round(float(item.get("low") or 0), 2),
                        "volume": int(item.get("volume") or 0)
                    } for item in reversed(api_response["data"]) if item]
            except Exception as e:
                print(f"API trend error: {e}")
        
        # Get CSV statistics
        csv_stats = {"avg_price": 0, "max_high": 0, "total_records": 0}
        try:
            csv_path = os.path.join(DATA_DIR, f"cleaned_{clean_sym.lower()}.csv")
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                if not df.empty and 'close' in df.columns and 'high' in df.columns:
                    csv_stats = {
                        "avg_price": round(float(df["close"].mean()), 2) if not df.empty else 0,
                        "max_high": round(float(df["high"].max()), 2) if not df.empty else 0,
                        "min_low": round(float(df["low"].min()), 2) if 'low' in df.columns else 0,
                        "total_records": len(df),
                        "last_csv_date": str(df.iloc[-1]["date"])[:10] if not df.empty else ""
                    }
        except Exception as e:
            print(f"CSV stats error: {e}")
        
        return jsonify({
            "symbol": clean_sym,
            "api_trend": api_trend,
            "csv_stats": csv_stats,
            "status": "Success" if api_trend else "Partial (CSV Only)"
        })
        
    except Exception as e:
        print(f"Stock analysis error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/stats", methods=["GET"])
def get_market_stats():
    """Get market statistics"""
    try:
        count = 0
        if os.path.exists(DATA_DIR):
            count = len([f for f in os.listdir(DATA_DIR) 
                        if f.startswith("cleaned_") and f.endswith(".csv")])
        
        return jsonify({
            "universe_count": count,
            "status": "Optimal" if count > 0 else "Empty",
            "last_updated": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Market stats error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/top-stocks", methods=["GET"])
def top_stocks():
    """Get top 6 stocks by price"""
    try:
        results = []
        if os.path.exists(DATA_DIR):
            for file in os.listdir(DATA_DIR):
                if not file.startswith("cleaned_") or not file.endswith(".csv"):
                    continue
                
                try:
                    csv_path = os.path.join(DATA_DIR, file)
                    df = pd.read_csv(csv_path)
                    
                    # Check if the required columns exist
                    if not df.empty and 'close' in df.columns:
                        # Get the latest price
                        latest_price = float(df['close'].iloc[-1])
                        symbol = clean_symbol_from_file(file)
                        
                        results.append({
                            "symbol": symbol,
                            "price": round(latest_price, 2),
                            "change": 0,  # You can calculate change if needed
                            "volume": int(df['volume'].iloc[-1]) if 'volume' in df.columns else 0
                        })
                except Exception as e:
                    print(f"Error reading {file}: {e}")
                    continue
        
        # Sort by price in descending order and take top 6
        sorted_results = sorted(results, key=lambda x: x["price"], reverse=True)[:6]
        
        return jsonify(sorted_results)
        
    except Exception as e:
        print(f"Top stocks error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/volume", methods=["GET"])
def volume_distribution():
    """Get top 5 stocks by volume"""
    try:
        data = []
        if os.path.exists(DATA_DIR):
            for file in os.listdir(DATA_DIR):
                if not file.startswith("cleaned_") or not file.endswith(".csv"):
                    continue
                
                try:
                    csv_path = os.path.join(DATA_DIR, file)
                    df = pd.read_csv(csv_path)
                    
                    # Check if the required columns exist
                    if not df.empty and 'volume' in df.columns and 'close' in df.columns:
                        # Calculate average volume
                        avg_volume = float(df['volume'].mean())
                        latest_price = float(df['close'].iloc[-1])
                        symbol = clean_symbol_from_file(file)
                        
                        data.append({
                            "symbol": symbol,
                            "volume": int(avg_volume),
                            "price": round(latest_price, 2)
                        })
                except Exception as e:
                    print(f"Error reading {file}: {e}")
                    continue
        
        # Sort by volume in descending order and take top 5
        sorted_data = sorted(data, key=lambda x: x["volume"], reverse=True)[:5]
        
        return jsonify(sorted_data)
        
    except Exception as e:
        print(f"Volume distribution error: {e}")
        return jsonify({"error": str(e)}), 500

# --- ADDITIONAL DASHBOARD ENDPOINTS ---

@analytics_bp.route("/analytics/live-trend/<symbol>", methods=["GET"])
def get_live_trend(symbol):
    """Get live trend data for dashboard with real-time API priority"""
    try:
        clean_sym = symbol.strip().upper()
        market_status = get_market_status()
        
        # Always try API first for live data
        live_data_available = False
        trend_data = []
        current_price = 0
        change = 0
        percent_change = 0
        
        if MARKET_API_KEY and market_status["isOpen"]:
            try:
                # For market open, try to get intraday data if available
                api_response = fetch_marketstack_data(clean_sym, limit=20)
                
                if api_response and "data" in api_response and api_response["data"]:
                    live_data = []
                    for i, item in enumerate(api_response["data"]):
                        if item and item.get("close"):
                            live_data.append({
                                "time": item.get("date", "")[:10],
                                "price": round(float(item.get("close") or 0), 2),
                                "open": round(float(item.get("open") or 0), 2),
                                "high": round(float(item.get("high") or 0), 2),
                                "low": round(float(item.get("low") or 0), 2),
                                "volume": int(item.get("volume") or 0),
                                "is_today": i == 0,
                                "source": "API_LIVE"
                            })
                    
                    if live_data:
                        trend_data = live_data
                        latest = trend_data[0]
                        current_price = latest["price"]
                        
                        # Calculate change from yesterday's close
                        if len(trend_data) > 1:
                            prev_close = trend_data[1]["price"]
                            change = current_price - prev_close
                            percent_change = (change / prev_close * 100) if prev_close else 0
                        
                        live_data_available = True
            except Exception as api_error:
                print(f"Live API error for {clean_sym}: {api_error}")
        
        # If no live data, use the most recent API data
        if not live_data_available and MARKET_API_KEY:
            try:
                api_response = fetch_marketstack_data(clean_sym, limit=10)
                if api_response and "data" in api_response:
                    api_trend = []
                    for i, item in enumerate(api_response["data"]):
                        if item:
                            api_trend.append({
                                "time": item.get("date", "")[:10],
                                "price": round(float(item.get("close") or 0), 2),
                                "volume": int(item.get("volume") or 0),
                                "is_today": i == 0,
                                "source": "API_HISTORICAL"
                            })
                    
                    if api_trend:
                        trend_data = api_trend[::-1]  # Reverse for chronological order
                        latest = api_trend[0]
                        current_price = latest["price"]
                        
                        if len(api_trend) > 1:
                            prev_close = api_trend[1]["price"]
                            change = current_price - prev_close
                            percent_change = (change / prev_close * 100) if prev_close else 0
            except Exception as e:
                print(f"Historical API error: {e}")
        
        # CSV Fallback as last resort
        if not trend_data:
            csv_data = get_csv_data(clean_sym)
            if csv_data:
                recent_data = csv_data[-10:] if len(csv_data) >= 10 else csv_data
                if recent_data:
                    latest = recent_data[-1]
                    prev = recent_data[-2] if len(recent_data) > 1 else latest
                    
                    trend_data = [{
                        "time": d["date"],
                        "price": d["close"],
                        "volume": d["volume"],
                        "is_today": False,
                        "source": "CSV"
                    } for d in recent_data]
                    
                    current_price = latest["close"]
                    change = current_price - (prev["close"] if prev else current_price)
                    percent_change = (change / (prev["close"] if prev else current_price) * 100) if (prev or current_price) else 0
        
        return jsonify({
            "symbol": clean_sym,
            "trend": trend_data,
            "current": round(current_price, 2),
            "change": round(change, 2),
            "percent_change": round(percent_change, 2),
            "is_positive": change >= 0,
            "market_status": market_status,
            "source": trend_data[0]["source"] if trend_data else "none",
            "last_updated": datetime.now().isoformat(),
            "data_points": len(trend_data)
        })
        
    except Exception as e:
        print(f"Live trend error: {e}")
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/available-symbols", methods=["GET"])
def get_available_symbols():
    """Get list of all available stock symbols"""
    try:
        symbols = []
        if os.path.exists(DATA_DIR):
            for file in os.listdir(DATA_DIR):
                if file.startswith("cleaned_") and file.endswith(".csv"):
                    symbol = clean_symbol_from_file(file)
                    symbols.append({
                        "symbol": symbol,
                        "has_csv": True,
                        "has_api": MARKET_API_KEY is not None
                    })
        
        return jsonify({
            "symbols": symbols,
            "count": len(symbols),
            "last_updated": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Available symbols error: {e}")
        return jsonify({"error": str(e)}), 500