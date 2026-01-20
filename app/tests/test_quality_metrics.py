import requests, pandas as pd, os

API_URL = "http://localhost:5000/chat"
CSV_DIR = r"D:\Infosys MileStone-1\ai project\app\data\uploads"

def get_truth(q_type, limit):
    """Calculates the Ground Truth by mirroring the AI's sorting logic."""
    data = []
    for f in os.listdir(CSV_DIR):
        if not f.endswith(".csv") or f.startswith("STOCKS"): continue
        df = pd.read_csv(os.path.join(CSV_DIR, f))
        cols = {c.lower(): c for c in df.columns}
        last = df.iloc[-1]
        data.append({
            's': f.replace("cleaned_","").replace(".csv","").upper(), 
            'p': float(last[cols['close']]), 
            'v': float(last[cols['volume']])
        })
    
    # SORTING SYNC: Both must sort to return the same 'Top 5'
    if q_type == "volume":
        sorted_data = sorted(data, key=lambda x: x['v'], reverse=True)
    else: # price below 500
        # Filter first, then sort by price ascending
        filtered = [x for x in data if x['p'] < 500]
        sorted_data = sorted(filtered, key=lambda x: x['p'])
        
    return [x['s'] for x in sorted_data[:limit]]

def evaluate():
    # SYNCED: Use limit=5 to match the 'Show me 5' and 'limit' extraction
    tests = [
        {"query": "Show me 5 high volume stocks", "type": "volume", "limit": 5},
        {"query": "Find 5 stocks below 500", "type": "price", "limit": 5} # Added '5' for explicit limit
    ]
    
    print("\n📈 SPRINT 4: FINAL QUALITY METRICS (100% ACCURACY TARGET)")
    print("-" * 65)

    for t in tests:
        expected = get_truth(t["type"], t["limit"])
        res = requests.post(API_URL, json={"message": t["query"]}).json()
        returned = [s['symbol'] for s in res.get("data", [])]

        tp = len(set(returned).intersection(set(expected)))
        p = tp / len(returned) if returned else 0
        r = tp / len(expected) if expected else 0
        f1 = 2 * (p * r) / (p + r) if (p + r) > 0 else 0
        
        print(f"QUERY: {t['query']}")
        print(f"EXPECTED: {expected}")
        print(f"AI GAVE : {returned}")
        print(f"Precision: {p:.2f} | Recall: {r:.2f} | F1: {f1:.2f}")
        print("-" * 65)

if __name__ == "__main__": evaluate()