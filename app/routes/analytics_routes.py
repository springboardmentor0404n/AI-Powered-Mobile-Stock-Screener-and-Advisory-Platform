from fastapi import APIRouter
from app.state import app_state
import pandas as pd

router = APIRouter()

def get_avg_price(row):
    prices = []
    for col in ["open", "high", "low", "close", "price", "ltp", "last"]:
        if col in row and pd.notna(row[col]):
            prices.append(row[col])
    return round(sum(prices) / len(prices), 2) if prices else None


from fastapi import APIRouter
from app.state import app_state
import pandas as pd
import numpy as np

router = APIRouter()


def get_avg_price(row):
    prices = []
    for col in ["open", "high", "low", "close", "price", "ltp", "last"]:
        if col in row and pd.notna(row[col]):
            prices.append(row[col])
    return round(sum(prices) / len(prices), 2) if prices else None


@router.get("/stocks/table")
def stocks_table():
    df = app_state.get("raw_df")

    if df is None or df.empty:
        return []

    df = df.copy()

    # detect volume column safely
    volume_col = None
    for col in ["volume", "qty", "traded_volume"]:
        if col in df.columns:
            volume_col = col
            break

    result = []

    for _, row in df.iterrows():
        if "symbol" not in row:
            continue

        close_price = None
        for col in ["close", "price", "ltp", "last"]:
            if col in df.columns and pd.notna(row[col]):
                close_price = row[col]
                break

        if close_price is None:
            close_price = get_avg_price(row)

        item = {
            "symbol": row["symbol"],
            "open": row.get("open"),
            "close": close_price,
            "volume": row.get(volume_col) if volume_col else None,
        }

        # 🔒 CRITICAL FIX: make JSON-safe
        for k, v in item.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                item[k] = None

        result.append(item)

    return result
