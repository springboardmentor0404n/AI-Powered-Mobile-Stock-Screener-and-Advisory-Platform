import pandas as pd
import os

UPLOAD_DIR = "app/data/uploads"

def run_screener(filters, symbols=None, quarters=None):
    results = []
    if not os.path.exists(UPLOAD_DIR): return []

    for file in os.listdir(UPLOAD_DIR):
        if not file.endswith(".csv") or file.startswith("STOCKS"): continue
        
        symbol_name = file.replace("cleaned_","").replace(".csv","").lower()
        
        # If specific symbols/keywords are requested, skip files that don't match
        # We do a loose match: if ANY keyword is in the symbol name
        if symbols:
             if not any(k.lower() in symbol_name for k in symbols): continue

        try:
            df = pd.read_csv(os.path.join(UPLOAD_DIR, file))
            # Normalized Header Mapping
            cols = {c.lower(): c for c in df.columns}
            
            df[cols['date']] = pd.to_datetime(df[cols['date']], format='%Y-%m-%d', errors='coerce')
            df = df.dropna(subset=[cols['date']]).sort_values(cols['date'])
            
            # Use LATEST data point as the source of truth
            latest = df.iloc[-1]
            price = float(latest[cols['close']])
            volume = float(latest.get(cols.get('volume'), 0))

            # Apply Logic Filters (Fixes Precision)
            match = True
            for f in filters:
                if f["field"] == "close":
                    if f["operator"] == "<" and not (price < f["value"]): match = False
                    if f["operator"] == ">" and not (price > f["value"]): match = False
            
            if match:
                results.append({
                    "symbol": file.replace("cleaned_","").replace(".csv","").upper(),
                    "close": price,
                    "volume": volume
                })
        except: continue
    return results