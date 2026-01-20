from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter(
    prefix="/live",
    tags=["Live Market"]
)

@router.get("/candles/{symbol}")
def yahoo_live_candles(symbol: str):
    try:
        ticker = yf.Ticker(symbol.upper())

        # intraday candles
        df = ticker.history(period="5d", interval="5m")

        if df.empty:
            raise HTTPException(404, "No data returned")

        candles = []
        for idx, row in df.iterrows():
            candles.append({
                "time": idx.strftime("%Y-%m-%d %H:%M"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
            })

        return candles

    except Exception as e:
        raise HTTPException(500, str(e))
