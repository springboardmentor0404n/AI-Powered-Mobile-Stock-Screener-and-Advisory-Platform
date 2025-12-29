from flask import Blueprint, jsonify
import pandas as pd
import os

analytics_bp = Blueprint("analytics", __name__)

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


@analytics_bp.route("/analytics/top-stocks", methods=["GET"])
def top_stocks():
    results = []

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

    results = sorted(results, key=lambda x: x["price"], reverse=True)[:10]
    return jsonify(results)


@analytics_bp.route("/analytics/volume", methods=["GET"])
def volume_distribution():
    data = []

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

    # ✅ Top 5 by volume (best for pie chart)
    data = sorted(data, key=lambda x: x["volume"], reverse=True)[:5]

    return jsonify(data)
