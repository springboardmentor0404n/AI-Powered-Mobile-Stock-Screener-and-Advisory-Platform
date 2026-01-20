from fastapi import APIRouter, HTTPException
import requests
import os

router = APIRouter(
    prefix="/live",
    tags=["Live Market"]
)

API_KEY = os.getenv("TD_API_KEY")

BASE_URL = "https://api.twelvedata.com/time_series"


@router.get("/candles/{symbol}")
def live_candles(symbol: str):
    if not API_KEY:
        raise HTTPException(500, "TD_API_KEY not set")

    params = {
        "symbol": symbol.replace(".NS", ""),
        "exchange": "NSE",
        "interval": "5min",
        "outputsize": 100,
        "apikey": API_KEY,
        "format": "JSON",
    }

    response = requests.get(BASE_URL, params=params, timeout=10)
    data = response.json()

    if "values" not in data:
        raise HTTPException(400, {
            "error": "Invalid TwelveData response",
            "raw": data
        })

    candles = []
    for c in reversed(data["values"]):
        candles.append({
            "time": c["datetime"],
            "open": float(c["open"]),
            "high": float(c["high"]),
            "low": float(c["low"]),
            "close": float(c["close"]),
        })

    return candles
