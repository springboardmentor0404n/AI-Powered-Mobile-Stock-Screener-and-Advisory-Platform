import os
import pickle
import pandas as pd
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "company_level_data.csv")
EMB_PATH = os.path.join(BASE_DIR, "embeddings.pkl")

print("Reading CSV:", CSV_PATH)

df = pd.read_csv(CSV_PATH)

texts = []
symbols = []

for _, row in df.iterrows():
    symbol = str(row["Symbol"]).upper()
    close = row["Close"]
    volume = row.get("Volume", "unknown")

    text = (
        f"{symbol} stock, close price {close}, "
        f"trading volume {volume}"
    )

    texts.append(text)
    symbols.append(symbol)

model = SentenceTransformer("all-MiniLM-L6-v2")
vectors = model.encode(texts, show_progress_bar=True)

with open(EMB_PATH, "wb") as f:
    pickle.dump(
        {
            "symbols": symbols,
            "embeddings": vectors.tolist()
        },
        f
    )

print("✅ Embeddings rebuilt successfully from company_level_data.csv")
