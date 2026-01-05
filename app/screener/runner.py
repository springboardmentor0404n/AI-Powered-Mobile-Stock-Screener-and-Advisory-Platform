import pandas as pd
import os

UPLOAD_DIR = "app/data/uploads"
NUMERIC_COLS = ["open", "high", "low", "close", "volume", "vwap", "turnover", "trades", "%deliverble"]
INVALID_SYMBOLS = {"STOCKS", "ALL", "MARKET", "SHARES"}

def run_screener(filters, symbols=None, quarters=None):
    """
    Core engine to process CSV data for both Dashboard summaries 
    and detailed historical charts.
    """
    results = []

    if not os.path.exists(UPLOAD_DIR):
        return results

    if symbols:
        symbols = [s.upper() for s in symbols]

    for file in os.listdir(UPLOAD_DIR):
        if not file.endswith(".csv"):
            continue

        symbol = file.replace("cleaned_", "").replace(".csv", "").upper()

        if not symbol or symbol in INVALID_SYMBOLS:
            continue

        if symbols and symbol not in symbols:
            continue

        try:
            df = pd.read_csv(os.path.join(UPLOAD_DIR, file))
        except Exception:
            continue

        if df.empty:
            continue

        # 🔒 Force Numeric Conversion
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # 📅 Date Parsing & Sorting
        date_col = next((c for c in df.columns if c.lower() == "date"), None)
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True, format='mixed')
            df = df.dropna(subset=[date_col]) 
            df = df.sort_values(date_col)

        # ✅ Quarterly Resampling Logic
        if quarters and date_col:
            df = df.set_index(date_col)
            # QE = Quarter End. We aggregate daily rows into 3-month summaries.
            df = df.resample('QE').agg({
                'close': 'last',      # Closing price of the quarter
                'open': 'first',       # Price at the start of the quarter
                'volume': 'sum',      # Total quarterly volume
                'high': 'max',        # Peak price in the period
                'low': 'min',         # Lowest price in the period
                'turnover': 'sum',    # Cumulative money flow
                'trades': 'sum'       # Total trade count
            }).dropna()
            
            # Slice the specific history requested by the UI
            df = df.tail(quarters).reset_index()
            df = df.rename(columns={'index': date_col})

        # 🔍 Apply LLM-Detected Filters
        for f in filters:
            field, op, val = f["field"], f["operator"], f["value"]
            if field not in df.columns: continue
            try:
                if op == "<": df = df[df[field] < val]
                elif op == ">": df = df[df[field] > val]
                elif op == "==": df = df[df[field] == val]
                elif op == "<=": df = df[df[field] <= val]
                elif op == ">=": df = df[df[field] >= val]
            except Exception:
                continue

        if df.empty:
            continue

        # ✅ OUTPUT GENERATION
        if symbols and len(symbols) > 0:
            # CHART MODE: Return the full historical array
            history_records = df.to_dict('records')
            for record in history_records:
                record["symbol"] = symbol
                if date_col in record:
                    record[date_col] = record[date_col].strftime('%Y-%m-%d')
            results.extend(history_records)
        else:
            # DASHBOARD MODE: Return only the latest aggregated point
            latest = df.iloc[-1].to_dict()
            latest["symbol"] = symbol
            
            # Strict cleaning for JSON-ready numbers
            latest["close"] = float(latest.get("close", 0)) if pd.notna(latest.get("close")) else 0.0
            latest["volume"] = int(latest.get("volume", 0)) if pd.notna(latest.get("volume")) else 0
            # Fallback for delivery column which is often null in custom CSVs
            latest["%deliverble"] = float(latest.get("%deliverble", 0)) if pd.notna(latest.get("%deliverble")) else 0.0
            
            if latest["close"] > 0:
                results.append(latest)

    return results