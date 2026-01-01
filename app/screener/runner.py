import pandas as pd
import os

UPLOAD_DIR = "app/data/uploads"

NUMERIC_COLS = ["open", "high", "low", "close", "volume"]

# ❌ Never treat these as real stocks
INVALID_SYMBOLS = {"STOCKS", "ALL", "MARKET", "SHARES"}

def run_screener(filters, symbols=None):
    results = []

    if not os.path.exists(UPLOAD_DIR):
        return results

    # Normalize symbols list once (case-safe)
    if symbols:
        symbols = [s.upper() for s in symbols]

    for file in os.listdir(UPLOAD_DIR):
        if not file.endswith(".csv"):
            continue

        # ✅ ALWAYS keep symbols in UPPERCASE
        symbol = file.replace("cleaned_", "").replace(".csv", "").upper()

        # 🚫 Skip fake / generic CSVs
        if not symbol or symbol in INVALID_SYMBOLS:
            continue

        # ✅ Company filter (case-safe)
        if symbols and symbol not in symbols:
            continue

        df = pd.read_csv(os.path.join(UPLOAD_DIR, file))

        if df.empty:
            continue

        # 🔒 Force numeric conversion
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Apply numeric filters
        for f in filters:
            field = f["field"]
            op = f["operator"]
            val = f["value"]

            if field not in df.columns:
                continue

            if op == "<":
                df = df[df[field] < val]
            elif op == ">":
                df = df[df[field] > val]
            elif op == "==":
                df = df[df[field] == val]
            elif op == "<=":
                df = df[df[field] <= val]
            elif op == ">=":
                df = df[df[field] >= val]

        if df.empty:
            continue

        # ✅ FIXED: Handle date column safely without warnings
        date_col = next((c for c in df.columns if c.lower() == "date"), None)
        if date_col:
            # Added 'dayfirst=True' and 'format="ISO8601"' to prevent parsing ambiguity
            # Use 'dayfirst=True' if your CSVs use DD-MM-YYYY format
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True, format='ISO8601')
            df = df.dropna(subset=[date_col]) # Remove rows where dates failed to parse
            df = df.sort_values(date_col)

        if df.empty:
            continue

        latest = df.iloc[-1]

        row = latest.to_dict()
        row["symbol"] = symbol

        # 🔒 NaN-SAFE numeric normalization (CRITICAL FIX)
        close_val = row.get("close")
        volume_val = row.get("volume")

        row["close"] = float(close_val) if pd.notna(close_val) else 0.0
        row["volume"] = int(volume_val) if pd.notna(volume_val) else 0

        # 🚫 FINAL SAFETY: skip invalid prices
        if row["close"] <= 0:
            continue

        results.append(row)

    return results