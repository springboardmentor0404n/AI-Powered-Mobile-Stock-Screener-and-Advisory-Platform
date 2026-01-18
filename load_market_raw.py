import pandas as pd
import psycopg2
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

CSV_PATH = "cleaned_market_trend.csv"

conn = psycopg2.connect(
    host="localhost",
    database="sample",
    user="postgres",
    password="post",
    port=5432
)
cur = conn.cursor()

model = SentenceTransformer("all-MiniLM-L6-v2")

df = pd.read_csv(CSV_PATH)

for _, row in tqdm(df.iterrows(), total=len(df)):
    # Convert entire row to text (important)
    row_text = " | ".join([f"{col}: {row[col]}" for col in df.columns])

    embedding = model.encode(row_text).tolist()

    cur.execute("""
        INSERT INTO market_data (
            Date, Open_Price, Close_Price, High_Price, Low_Price,
            Volume, Daily_Return_Pct, Volatility_Range, VIX_Close,
            Economic_News_Flag, Sentiment_Score, Federal_Rate_Change_Flag,
            GeoPolitical_Risk_Score, Currency_Index, MA20, MA50,
            Rolling_Volatility, embedding
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s
        )
    """, (
        row['Date'], row['Open_Price'], row['Close_Price'], row['High_Price'], row['Low_Price'],
        row['Volume'], row['Daily_Return_Pct'], row['Volatility_Range'], row['VIX_Close'],
        row['Economic_News_Flag'], row['Sentiment_Score'], row['Federal_Rate_Change_Flag'],
        row['GeoPolitical_Risk_Score'], row['Currency_Index'], row['MA20'], row['MA50'],
        row['Rolling_Volatility'], embedding
    ))

conn.commit()
cur.close()
conn.close()

print("Raw dataset + embeddings inserted successfully")
