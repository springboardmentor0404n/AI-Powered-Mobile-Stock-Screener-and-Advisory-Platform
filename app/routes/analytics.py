from flask import Blueprint, jsonify
import pandas as pd
import os
import requests # ✅ Added for direct API calls
from alpha_vantage.timeseries import TimeSeries # ✅ Standard for live fetching

analytics_bp = Blueprint("analytics", __name__)

# Safely retrieve your key from .env
MARKET_API_KEY = os.getenv("MARKET_API_KEY") 
DATA_DIR = "app/data/uploads"

# --- EXISTING UTILITY FUNCTIONS (Unchanged) ---
def safe_to_numeric(series):
    return pd.to_numeric(series, errors="coerce")

def clean_symbol(filename):
    return filename.replace("cleaned_", "").replace(".csv", "").upper()

# --- ✅ NEW: Live Fetching Route ---
@analytics_bp.route("/analytics/live-trend/<symbol>", methods=["GET"])
def get_live_trend(symbol):
    """
    Fetches real-time intraday data from Alpha Vantage using your API Key.
    Formats data specifically for the AreaChart in your Dashboard.
    """
    if not MARKET_API_KEY:
        return jsonify({"error": "API Key missing in .env"}), 500

    try:
        # Initialize TimeSeries with your key
        ts = TimeSeries(key=MARKET_API_KEY, output_format='json')
        
        # Fetch 5-minute interval data (NSE prefix for Indian stocks)
        # Use symbol as passed, or f"NSE:{symbol}" for Indian markets
        data, _ = ts.get_intraday(symbol=symbol, interval='5min', outputsize='compact')
        
        # Format the messy API response into a clean list for Recharts
        formatted_data = []
        for timestamp, values in sorted(data.items()):
            formatted_data.append({
                "time": timestamp.split(' ')[1][:5], # Extract HH:MM
                "close": float(values['4. close'])   # Convert to numeric float
            })
            
        return jsonify(formatted_data)
        
    except Exception as e:
        print(f"[ERROR] Live fetch failed for {symbol}: {e}")
        return jsonify({"error": "Could not fetch live data"}), 500

# --- EXISTING BLUEPRINT ROUTES (Structure Maintained) ---

@analytics_bp.route("/analytics/stats", methods=["GET"])
def get_market_stats():
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({"universe_count": 0, "status": "No Data"})
        all_files = os.listdir(DATA_DIR)
        cleaned_csv_count = len([f for f in all_files if f.startswith("cleaned_") and f.endswith(".csv")])
        return jsonify({"universe_count": cleaned_csv_count, "status": "Optimal"})
    except Exception as e:
        return jsonify({"universe_count": 0, "error": str(e)}), 500

@analytics_bp.route("/analytics/top-stocks", methods=["GET"])
def top_stocks():
    results = []
    if not os.path.exists(DATA_DIR): return jsonify([])
    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"): continue
        symbol = clean_symbol(file)
        path = os.path.join(DATA_DIR, file)
        try:
            df = pd.read_csv(path)
            if "close" not in df.columns: continue
            df["close"] = safe_to_numeric(df["close"])
            close_series = df["close"].dropna()
            if close_series.empty: continue
            last_price = close_series.iloc[-1]
            results.append({"symbol": symbol, "price": float(last_price)})
        except: continue
    return jsonify(sorted(results, key=lambda x: x["price"], reverse=True)[:6])

@analytics_bp.route("/analytics/volume", methods=["GET"])
def volume_distribution():
    data = []
    if not os.path.exists(DATA_DIR): return jsonify([])
    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"): continue
        symbol = clean_symbol(file)
        path = os.path.join(DATA_DIR, file)
        try:
            df = pd.read_csv(path)
            if "volume" not in df.columns: continue
            df["volume"] = safe_to_numeric(df["volume"])
            volume_series = df["volume"].dropna()
            if volume_series.empty: continue
            data.append({"symbol": symbol, "volume": int(volume_series.sum())})
        except: continue
    return jsonify(sorted(data, key=lambda x: x["volume"], reverse=True)[:5])