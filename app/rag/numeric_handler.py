from app.state import app_state


def handle_numeric_query(query: str):
    df = app_state.get("numeric_df")
    cols = app_state.get("columns")

    if df is None or df.empty or cols is None:
        return "No numeric data available. Please upload a file first."

    q = query.lower()

    price_col = cols.get("price")
    volume_col = cols.get("volume")

    # Safety checks
    if price_col is None:
        return "Price column not found in uploaded data."

    # ================= PRICE QUERIES =================
    if "highest price" in q or "max price" in q:
        return f"Highest price is {df[price_col].max():.2f}"

    if "lowest price" in q or "min price" in q:
        return f"Lowest price is {df[price_col].min():.2f}"

    if "average price" in q or "avg price" in q:
        return f"Average price is {df[price_col].mean():.2f}"

    # ================= VOLUME QUERIES =================
    if volume_col:
        if "highest volume" in q or "max volume" in q:
            return f"Highest volume is {int(df[volume_col].max())}"

        if "average volume" in q:
            return f"Average volume is {int(df[volume_col].mean())}"

    return None
