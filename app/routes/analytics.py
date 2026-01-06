import os
import requests
import pandas as pd
from flask import Blueprint, jsonify
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from .env
load_dotenv()

analytics_bp = Blueprint("analytics", __name__)

# Constants
DATA_DIR = "app/data/uploads"
MARKET_API_KEY = os.getenv("MARKET_API_KEY")

# --- HELPER FUNCTIONS ---

def get_marketstack_symbol(symbol):
    """Convert symbol to Marketstack format (defaults to NSE)"""
    # Remove common suffixes to avoid duplication
    clean = symbol.replace('.XNSE', '').replace('.NS', '').replace('.NSE', '').replace('.BSE', '')
    return f"{clean}.XNSE"

def safe_to_numeric(series):
    return pd.to_numeric(series, errors="coerce")

def clean_symbol_from_file(filename):
    return filename.replace("cleaned_", "").replace(".csv", "").upper()

# --- EXTERNAL API ROUTES (Marketstack) ---

@analytics_bp.route("/analytics/live-trend/<symbol>", methods=["GET"])
def get_live_trend(symbol):
    """Fetch 30-day historical EOD data for charting"""
    if not MARKET_API_KEY:
        return jsonify({"error": "API Key missing"}), 500

    try:
        marketstack_symbol = get_marketstack_symbol(symbol)
        url = "http://api.marketstack.com/v1/eod"
        
        params = {
            "access_key": MARKET_API_KEY,
            "symbols": marketstack_symbol,
            "limit": 30,
            "sort": "DESC"
        }

        response = requests.get(url, params=params, timeout=15)
        data = response.json()

        # Handle API errors (limit reached, invalid key, etc.)
        if response.status_code != 200 or "error" in data:
            # Fallback: Try BSE if NSE returns no data
            alt_symbol = marketstack_symbol.replace('.XNSE', '.BSE')
            params["symbols"] = alt_symbol
            response = requests.get(url, params=params, timeout=15)
            data = response.json()
            
            if response.status_code != 200 or "data" not in data or not data["data"]:
                return jsonify({"error": "Data unavailable", "details": data.get("error")}), 404

        # Format and reverse data so it goes from Oldest -> Newest (better for charts)
        formatted_data = []
        for item in data["data"]:
            date_str = item.get("date", "")[:10]
            formatted_data.append({
                "time": date_str,
                "date": date_str,
                "open": round(float(item.get("open") or 0), 2),
                "high": round(float(item.get("high") or 0), 2),
                "low": round(float(item.get("low") or 0), 2),
                "close": round(float(item.get("close") or 0), 2),
                "volume": int(item.get("volume") or 0),
                "symbol": symbol.upper()
            })
        
        # Sort by date ascending for frontend charting libraries
        formatted_data.sort(key=lambda x: x["time"])
        
        return jsonify({
            "status": "success",
            "symbol": symbol.upper(),
            "data": formatted_data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/latest-price/<symbol>", methods=["GET"])
def get_latest_price(symbol):
    """Quick lookup for the most recent closing price"""
    if not MARKET_API_KEY:
        return jsonify({"error": "API Key missing"}), 500

    try:
        marketstack_symbol = get_marketstack_symbol(symbol)
        url = "http://api.marketstack.com/v1/eod/latest"
        params = {"access_key": MARKET_API_KEY, "symbols": marketstack_symbol}

        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if response.status_code == 200 and "data" in data and data["data"]:
            item = data["data"][0] if isinstance(data["data"], list) else data["data"]
            return jsonify({
                "symbol": symbol.upper(),
                "price": round(float(item.get("close") or 0), 2),
                "change": round(float(item.get("change") or 0), 2),
                "change_percent": round(float(item.get("change_percent") or 0), 2),
                "last_updated": item.get("date", "")[:10]
            })
        
        return jsonify({"error": "No data available"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- HYBRID INTELLIGENCE ROUTE ---

@analytics_bp.route("/analytics/stock-analysis/<symbol>", methods=["GET"])
def get_stock_analysis(symbol):
    """Combines Live API Trend with Historical Local CSV statistics"""
    key = os.getenv("MARKET_API_KEY")
    clean_sym = symbol.strip().upper()
    
    # 1. Fetch EOD API Data (Last 30 Days)
    api_trend = []
    if key:
        try:
            url = "http://api.marketstack.com/v1/eod"
            # Using get_marketstack_symbol helper for Indian stock compatibility
            market_sym = get_marketstack_symbol(clean_sym)
            params = {"access_key": key, "symbols": market_sym, "limit": 30}
            res = requests.get(url, params=params, timeout=10).json()
            if "data" in res:
                api_trend = [{"time": i["date"][:10], "close": round(i["close"], 2)} for i in reversed(res["data"])]
        except Exception as e:
            print(f"API Fetch Error: {e}")

    # 2. Fetch CSV Data (All-time Historical)
    csv_stats = {"avg_price": 0, "max_high": 0, "total_records": 0}
    try:
        path = os.path.join(DATA_DIR, f"cleaned_{clean_sym.lower()}.csv")
        if os.path.exists(path):
            df = pd.read_csv(path)
            csv_stats = {
                "avg_price": round(float(df["close"].mean()), 2),
                "max_high": round(float(df["high"].max()), 2),
                "total_records": len(df),
                "last_csv_date": str(df.iloc[-1]["date"])[:10]
            }
    except Exception as e:
        print(f"CSV Parse Error: {e}")

    return jsonify({
        "symbol": clean_sym,
        "api_trend": api_trend,
        "csv_stats": csv_stats,
        "status": "Success" if api_trend else "Partial (CSV Only)"
    })

# --- LOCAL CSV ANALYTICS ROUTES ---

@analytics_bp.route("/analytics/stats", methods=["GET"])
def get_market_stats():
    """Count how many cleaned CSVs are in the upload directory"""
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({"universe_count": 0, "status": "No Directory"})
        
        all_files = os.listdir(DATA_DIR)
        count = len([f for f in all_files if f.startswith("cleaned_") and f.endswith(".csv")])
        return jsonify({"universe_count": count, "status": "Optimal" if count > 0 else "Empty"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/analytics/top-stocks", methods=["GET"])
def top_stocks():
    """Get the 6 stocks with the highest 'close' price from local files"""
    results = []
    if not os.path.exists(DATA_DIR): return jsonify([])
    
    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"): continue
        path = os.path.join(DATA_DIR, file)
        try:
            df = pd.read_csv(path)
            if "close" in df.columns:
                df["close"] = safe_to_numeric(df["close"])
                last_price = df["close"].dropna().iloc[-1]
                results.append({
                    "symbol": clean_symbol_from_file(file),
                    "price": float(last_price)
                })
        except: continue
        
    return jsonify(sorted(results, key=lambda x: x["price"], reverse=True)[:6])

@analytics_bp.route("/analytics/volume", methods=["GET"])
def volume_distribution():
    """Sum total volume per stock from local files"""
    data = []
    if not os.path.exists(DATA_DIR): return jsonify([])
    
    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"): continue
        path = os.path.join(DATA_DIR, file)
        try:
            df = pd.read_csv(path)
            if "volume" in df.columns:
                df["volume"] = safe_to_numeric(df["volume"])
                total_vol = df["volume"].dropna().sum()
                data.append({
                    "symbol": clean_symbol_from_file(file),
                    "volume": int(total_vol)
                })
        except: continue
        
    return jsonify(sorted(data, key=lambda x: x["volume"], reverse=True)[:5])