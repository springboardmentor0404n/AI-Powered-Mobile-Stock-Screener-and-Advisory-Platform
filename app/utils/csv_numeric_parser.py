import pandas as pd
from io import BytesIO

def parse_csv_numeric(file_bytes: bytes):
    df = pd.read_csv(BytesIO(file_bytes))

    # normalize columns
    df.columns = df.columns.str.lower().str.strip()

    def find_col(possible):
        for p in possible:
            if p in df.columns:
                return p
        return None

    date_col = find_col(["date", "time", "timestamp"])
    open_col = find_col(["open"])
    high_col = find_col(["high"])
    low_col  = find_col(["low"])
    close_col = find_col(["close", "price", "ltp"])
    volume_col = find_col(["volume", "qty"])

    if not date_col or not close_col:
        raise ValueError("CSV must contain date and close columns")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col, close_col])

    return {
        "date": df[date_col].astype(str).tolist(),
        "open": df[open_col].tolist() if open_col else [],
        "high": df[high_col].tolist() if high_col else [],
        "low": df[low_col].tolist() if low_col else [],
        "close": df[close_col].tolist(),
        "volume": df[volume_col].tolist() if volume_col else []
    }
