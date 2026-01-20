from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf

router = APIRouter()

class LivePriceRequest(BaseModel):
    symbols: list[str]

@router.post("/live-prices")
def get_live_prices(payload: LivePriceRequest):
    try:
        results = []

        for symbol in payload.symbols:
            ticker = yf.Ticker(symbol)
            price = ticker.fast_info.get("last_price")

            if price is None:
                continue

            results.append({
                "symbol": symbol,
                "price": float(price)
            })

        return results

    except Exception as e:
        print("LIVE PRICE ERROR:", e)
        # ⬇️ return empty list instead of crashing
        return []
