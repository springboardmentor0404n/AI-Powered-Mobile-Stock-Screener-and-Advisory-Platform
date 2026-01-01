from flask import Blueprint, jsonify
import pandas as pd
import os

analytics_bp = Blueprint("analytics", __name__)

# Ensure this path matches your VS Code explorer structure
DATA_DIR = "app/data/uploads"

def safe_to_numeric(series):
    return pd.to_numeric(series, errors="coerce")

def clean_symbol(filename):
    return (
        filename
        .replace("cleaned_", "")
        .replace(".csv", "")
        .upper()
    )

@analytics_bp.route("/analytics/stats", methods=["GET"])
def get_market_stats():
    """
    Dynamically counts the number of cleaned CSV files for the Universe KPI.
    """
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({"universe_count": 0, "status": "No Data"})

        # Count files that follow the cleaned_*.csv naming pattern
        all_files = os.listdir(DATA_DIR)
        cleaned_csv_count = len([f for f in all_files if f.startswith("cleaned_") and f.endswith(".csv")])
        
        return jsonify({
            "universe_count": cleaned_csv_count,
            "status": "Optimal"
        })
    except Exception as e:
        print(f"[ERROR] Stats retrieval failed: {e}")
        return jsonify({"universe_count": 0, "error": str(e)}), 500

@analytics_bp.route("/analytics/top-stocks", methods=["GET"])
def top_stocks():
    results = []
    if not os.path.exists(DATA_DIR):
        return jsonify([])

    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"):
            continue

        symbol = clean_symbol(file)
        path = os.path.join(DATA_DIR, file)

        try:
            df = pd.read_csv(path)
            if "close" not in df.columns:
                continue

            df["close"] = safe_to_numeric(df["close"])
            close_series = df["close"].dropna()

            if close_series.empty:
                continue

            last_price = close_series.iloc[-1]
            results.append({
                "symbol": symbol,
                "price": float(last_price)
            })

        except Exception as e:
            print(f"[SKIPPED TOP-STOCK] {symbol}: {e}")
            continue

    # Limited to Top 6 for the enlarged "Neat and Clean" Dashboard view
    results = sorted(results, key=lambda x: x["price"], reverse=True)[:6]
    return jsonify(results)

@analytics_bp.route("/analytics/volume", methods=["GET"])
def volume_distribution():
    data = []
    if not os.path.exists(DATA_DIR):
        return jsonify([])

    for file in os.listdir(DATA_DIR):
        if not file.endswith(".csv"):
            continue

        symbol = clean_symbol(file)
        path = os.path.join(DATA_DIR, file)

        try:
            df = pd.read_csv(path)
            if "volume" not in df.columns:
                continue

            df["volume"] = safe_to_numeric(df["volume"])
            volume_series = df["volume"].dropna()

            if volume_series.empty:
                continue

            total_volume = volume_series.sum()
            data.append({
                "symbol": symbol,
                "volume": int(total_volume)
            })

        except Exception as e:
            print(f"[SKIPPED VOLUME] {symbol}: {e}")
            continue

    # Limited to Top 5 for high-fidelity donut chart clarity
    data = sorted(data, key=lambda x: x["volume"], reverse=True)[:5]
    return jsonify(data)