import yfinance as yf

SYMBOLS = [
    "ADANIPORTS.NS","ASIANPAINT.NS","AXISBANK.NS","BAJAJ-AUTO.NS",
    "BAJAJFINSV.NS","BAJAJ-AUTOFIN.NS","BAJFINANCE.NS","BHARTIARTL.NS",
    "BPCL.NS","BRITANNIA.NS","CIPLA.NS","COALINDIA.NS","DRREDDY.NS",
    "EICHERMOT.NS","GAIL.NS","GRASIM.NS","HCLTECH.NS","HDFC.NS","HDFCBANK.NS"
]

def get_stocks_data():
    result = []
    for s in SYMBOLS:
        stock = yf.Ticker(s)
        price = stock.history(period="1d")["Close"]

        if len(price) == 0:
            continue

        result.append({
            "symbol": s.replace(".NS",""),
            "price": round(float(price.iloc[-1]), 2),
            "spark": list(range(10))  # dummy sparkline data
        })

    return result
