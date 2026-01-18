import pandas as pd
import psycopg2
from sentence_transformers import SentenceTransformer

# ---------------- CONFIG ----------------
CSV_PATH = "fundamental_cleaned.csv"

DB_CONFIG = {
    "dbname": "sample",
    "user": "postgres",
    "password": "post",
    "host": "localhost",
    "port": "5432"
}

# ---------------- LOAD CSV ----------------
df = pd.read_csv(CSV_PATH)

# Keep only required columns
df = df[[
    "symbol",
    "revenuePerShare",
    "trailingPE",
    "earningsQuarterlyGrowth",
    "previousClose",
    "open",
    "dayLow",
    "dayHigh",
    "volume",
    "trailingEps",
    "pegRatio",
    "ebitda",
    "totalDebt",
    "totalRevenue",
    "debtToEquity",
    "earningsGrowth",
    "revenueGrowth"
]]

# Clean NaN
df = df.where(pd.notnull(df), None)
df["symbol"] = df["symbol"].str.upper().str.strip()

# ---------------- EMBEDDINGS ----------------
model = SentenceTransformer("all-MiniLM-L6-v2")

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

for _, row in df.iterrows():

    text = (
        f"{row['symbol']} stock fundamentals. "
        f"Open {row['open']}, close {row['previousClose']}, "
        f"high {row['dayHigh']}, low {row['dayLow']}. "
        f"PE {row['trailingPE']}, EPS {row['trailingEps']}. "
        f"Revenue growth {row['revenueGrowth']}, "
        f"Earnings growth {row['earningsGrowth']}. "
        f"Debt equity {row['debtToEquity']}."
    )

    embedding = model.encode(text).tolist()

    cur.execute("""
        INSERT INTO watchlist_fundamentals (
            symbol,
            revenue_per_share,
            trailing_pe,
            earnings_quarterly_growth,
            previous_close,
            open_price,
            day_low,
            day_high,
            volume,
            trailing_eps,
            peg_ratio,
            ebitda,
            total_debt,
            total_revenue,
            debt_to_equity,
            earnings_growth,
            revenue_growth,
            embedding
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        row["symbol"],
        row["revenuePerShare"],
        row["trailingPE"],
        row["earningsQuarterlyGrowth"],
        row["previousClose"],
        row["open"],
        row["dayLow"],
        row["dayHigh"],
        row["volume"],
        row["trailingEps"],
        row["pegRatio"],
        row["ebitda"],
        row["totalDebt"],
        row["totalRevenue"],
        row["debtToEquity"],
        row["earningsGrowth"],
        row["revenueGrowth"],
        embedding
    ))

conn.commit()
cur.close()
conn.close()

print("✅ ALL VALUES + EMBEDDINGS INSERTED CORRECTLY")
