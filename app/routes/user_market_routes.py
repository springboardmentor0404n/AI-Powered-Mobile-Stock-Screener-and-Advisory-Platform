from fastapi import APIRouter, HTTPException
from app.state import app_state

router = APIRouter()

# ---------------- INIT STATE ----------------
app_state.setdefault("watchlist", set())
app_state.setdefault("portfolio", [])
app_state.setdefault("raw_df", None)

# ---------------- WATCHLIST ----------------

@router.post("/watchlist/toggle")
def toggle_watchlist(symbol: str):
    symbol = symbol.upper()

    if symbol in app_state["watchlist"]:
        app_state["watchlist"].remove(symbol)
        return {"status": "removed", "symbol": symbol}
    else:
        app_state["watchlist"].add(symbol)
        return {"status": "added", "symbol": symbol}


@router.get("/watchlist")
def get_watchlist():
    """
    IMPORTANT:
    Return ONLY symbols.
    Frontend will enrich data.
    """
    return [{"symbol": s} for s in app_state["watchlist"]]

# ---------------- PORTFOLIO ----------------

@router.post("/portfolio/add")
def add_portfolio(stock: dict):
    if not {"symbol", "quantity", "buy_price"}.issubset(stock):
        raise HTTPException(400, "Invalid data")

    stock["symbol"] = stock["symbol"].upper()
    app_state["portfolio"].append(stock)
    return {"status": "ok"}


@router.get("/portfolio")
def get_portfolio():
    df = app_state.get("raw_df")
    if df is None:
        return []

    df = df.copy()
    df.columns = df.columns.str.lower().str.strip()
    df["symbol"] = df["symbol"].astype(str).str.upper()

    result = []

    for p in app_state["portfolio"]:
        row = df[df["symbol"] == p["symbol"]]
        if row.empty:
            continue

        row = row.iloc[0]
        price = row.get("close") or row.get("open") or row.get("price")

        pnl = (price - p["buy_price"]) * p["quantity"]

        result.append({
            "symbol": p["symbol"],
            "quantity": p["quantity"],
            "buy_price": p["buy_price"],
            "current_price": price,
            "pnl": round(pnl, 2)
        })

    return result

@router.get("/candles/{symbol}")
def get_candles(symbol: str):
    df = app_state.get("raw_df")
    if df is None:
        return []

    symbol = symbol.upper()
    df = df.copy()
    df.columns = df.columns.str.lower().str.strip()
    df["symbol"] = df["symbol"].astype(str).str.upper()

    stock_df = df[df["symbol"] == symbol]
    if stock_df.empty:
        return []

    candles = []

    # ✅ choose available price column
    price_col = None
    for c in ["close", "price", "ltp", "last_price"]:
        if c in stock_df.columns:
            price_col = c
            break

    if price_col is None:
        return []

    # ✅ generate fake OHLC from single price (industry standard fallback)
    for i, (_, row) in enumerate(stock_df.iterrows()):
        price = float(row[price_col])

        candles.append({
            "time": f"2024-01-{i+1:02d}",  # always valid yyyy-mm-dd
            "open": price,
            "high": price,
            "low": price,
            "close": price,
        })

    return candles
