from fastapi import APIRouter
import yfinance as yf

router = APIRouter(prefix="/market", tags=["Market"])

@router.get("/candles/{symbol}")
def get_live_candles(symbol: str):
    """
    Live-updating candles (30 min interval, last 5 days)
    """
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="5d", interval="5m")

        candles = []
        for index, row in df.iterrows():
            candles.append({
                "time": int(index.timestamp()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"]),
            })

        return candles
    except Exception as e:
        print("Live candle error:", e)
        return []
