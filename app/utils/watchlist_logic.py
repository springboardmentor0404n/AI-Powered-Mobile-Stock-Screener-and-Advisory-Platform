def compute_watchlist_signal(df, cols):
    """
    df   : pandas DataFrame for ONE stock
    cols : detected column mapping
    """

    price_col = cols["price"]
    volume_col = cols["volume"]

    # Safety check
    if df.empty or price_col is None:
        return None

    df = df.sort_values(cols["date"]) if cols["date"] else df

    latest = df.iloc[-1]
    previous = df.iloc[-2] if len(df) > 1 else latest

    # Price change %
    try:
        change_pct = ((latest[price_col] - previous[price_col]) / previous[price_col]) * 100
    except:
        change_pct = 0

    # Simple, stable logic
    if change_pct > 0.5:
        trend = "BULLISH"
        score = min(80, int(50 + change_pct * 5))
    elif change_pct < -0.5:
        trend = "BEARISH"
        score = max(20, int(50 + change_pct * 5))
    else:
        trend = "NEUTRAL"
        score = 50

    reason = f"Price changed by {change_pct:.2f}%"

    return {
        "last_price": round(float(latest[price_col]), 2),
        "change_pct": round(float(change_pct), 2),
        "trend": trend,
        "score": score,
        "reason": reason
    }
