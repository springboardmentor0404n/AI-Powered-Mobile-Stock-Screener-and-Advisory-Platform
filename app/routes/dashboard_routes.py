from fastapi import APIRouter
from app.state import app_state
import pandas as pd
import numpy as np

router = APIRouter()


@router.get("/summary")
def dashboard_summary():
    raw_df = app_state.get("raw_df")
    df = app_state.get("numeric_df")

    # 🔔 run alert engine (unchanged)
    from app.alerts.alert_engine import job
    job()

    # ===============================
    # FALLBACKS (UNCHANGED)
    # ===============================
    if df is None or df.empty:
        df = raw_df

    if df is None or df.empty or raw_df is None:
        return {"error": "No data available"}

    # ===============================
    # FORCE NUMERIC (UNCHANGED)
    # ===============================
    numeric_df = df.copy()
    numeric_df = numeric_df.apply(pd.to_numeric, errors="coerce")
    numeric_df = numeric_df.dropna(axis=1, how="all")

    if numeric_df.empty:
        return {"error": "No numeric data found"}

    # ===============================
    # DETECT SYMBOL COLUMN (UNCHANGED)
    # ===============================
    symbol_col = None
    for col in ["symbol", "name", "ticker", raw_df.columns[0]]:
        if col in raw_df.columns:
            symbol_col = col
            break

    if symbol_col is None:
        return {"error": "No symbol column found"}

    # ===============================
    # DETECT PRICE COLUMN (UNCHANGED)
    # ===============================
    price_col = None
    for col in ["price", "close", "adj_close", "last"]:
        if col in numeric_df.columns:
            price_col = col
            break

    if price_col is None:
        price_col = numeric_df.columns[0]

    # ===============================
    # BUILD PRICE SERIES
    # ===============================
    price_df = pd.concat(
        [raw_df[symbol_col], numeric_df[price_col]],
        axis=1
    ).dropna()

    prices = price_df.set_index(symbol_col)[price_col]

    if prices.empty:
        return {"error": "Price column has no valid data"}

    # ===============================
    # METRICS (UNCHANGED)
    # ===============================
    avg_price = float(prices.mean())
    median_price = float(prices.median())
    highest_price = float(prices.max())

    market_status = (
        "Bullish" if avg_price > median_price
        else "Bearish" if avg_price < median_price
        else "Neutral"
    )

    # ===============================
    # TOP 10 PRICES (SAFE)
    # ===============================
    top_10_prices = (
        prices.sort_values(ascending=False)
        .head(10)
        .reset_index()
        .rename(columns={symbol_col: "symbol", price_col: "price"})
    )

    # 🔒 SANITIZE NaN / inf (CRITICAL FIX)
    top_10_prices = top_10_prices.replace([np.nan, np.inf, -np.inf], None)
    top_10_prices = top_10_prices.to_dict(orient="records")

    # ===============================
    # VOLUME DISTRIBUTION (SAFE)
    # ===============================
    volume_distribution = []
    raw_df_numeric = raw_df.apply(pd.to_numeric, errors="ignore")

    if "volume" in raw_df_numeric.columns:
        vol_df = (
            raw_df_numeric[[symbol_col, "volume"]]
            .dropna()
            .head(15)
            .rename(columns={symbol_col: "name"})
        )

        vol_df = vol_df.replace([np.nan, np.inf, -np.inf], None)
        volume_distribution = vol_df.to_dict(orient="records")

    # ===============================
    # WATCHLIST PRICES (SAFE)
    # ===============================
    watchlist_prices = []
    watchlist_symbols = ["INFY.NS", "TCS.NS", "HCLTECH.NS", "WIPRO.NS"]

    temp_df = raw_df.copy()
    temp_df.columns = temp_df.columns.str.lower()

    sym_col = None
    pr_col = None

    for col in ["symbol", "name", "ticker"]:
        if col in temp_df.columns:
            sym_col = col
            break

    for col in ["price", "close", "last", "adj_close"]:
        if col in temp_df.columns:
            pr_col = col
            break

    if sym_col and pr_col:
        temp_df[pr_col] = pd.to_numeric(temp_df[pr_col], errors="coerce")

        wl_df = (
            temp_df[temp_df[sym_col].isin(watchlist_symbols)]
            [[sym_col, pr_col]]
            .dropna()
            .rename(columns={sym_col: "symbol", pr_col: "price"})
        )

        wl_df = wl_df.replace([np.nan, np.inf, -np.inf], None)
        watchlist_prices = wl_df.to_dict(orient="records")

    # ===============================
    # FINAL RESPONSE (UNCHANGED KEYS)
    # ===============================
    return {
        "total_stocks": int(len(prices)),
        "average_price": round(avg_price, 2),
        "highest_price": round(highest_price, 2),
        "market_status": market_status,
        "top_10_prices": top_10_prices,
        "volume_distribution": volume_distribution,
        "watchlist_prices": watchlist_prices,
        "source": app_state.get("source", "default"),
    }
