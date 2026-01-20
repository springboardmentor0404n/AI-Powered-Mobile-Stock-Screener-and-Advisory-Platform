import yfinance as yf

def get_live_price(symbol: str):
    stock = yf.Ticker(symbol)
    data = stock.history(period="1d", interval="1m")

    if data.empty:
        return None

    last = data.iloc[-1]
    return {
        "symbol": symbol,
        "price": round(last["Close"], 2),
        "open": round(last["Open"], 2),
        "high": round(last["High"], 2),
        "low": round(last["Low"], 2),
        "volume": int(last["Volume"]),
    }


def get_price_history(symbol: str, period="1d", interval="5m"):
    stock = yf.Ticker(symbol)
    df = stock.history(period=period, interval=interval)
    return [
        {
            "time": str(idx),
            "price": round(row["Close"], 2)
        }
        for idx, row in df.iterrows()
    ]

def get_latest_prices(symbols=None):
    """
    Used by alert engine.
    Returns price + change_percent for symbols.
    """

    if not symbols:
        return []

    results = []

    for symbol in symbols:
        data = yf.Ticker(symbol).history(period="2d")

        if len(data) < 2:
            continue

        prev_close = data.iloc[-2]["Close"]
        last_close = data.iloc[-1]["Close"]

        change_pct = ((last_close - prev_close) / prev_close) * 100

        from app.alerts.alert_engine import alert_price_drop

        if change_pct <= -5:
         alert_price_drop(db, symbol, change_pct)


        results.append({
            "symbol": symbol,
            "price": round(last_close, 2),
            "change_percent": round(change_pct, 2)
        })

    return results
