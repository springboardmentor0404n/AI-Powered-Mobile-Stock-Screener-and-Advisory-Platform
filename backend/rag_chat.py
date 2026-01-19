import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INDEX_PATH = os.path.join(BASE_DIR, "stock_index.faiss")
DATA_PATH = os.path.join(BASE_DIR, "stock_data.pkl")

model = SentenceTransformer("all-MiniLM-L6-v2")

index = faiss.read_index(INDEX_PATH)
stock_data = pickle.load(open(DATA_PATH, "rb"))

def ai_answer(question):
    q_embedding = model.encode([question])
    D, I = index.search(np.array(q_embedding), k=5)

    results = [stock_data[i] for i in I[0]]

    response = "📊 Based on current stock data, here are some insights:\n\n"

    for r in results:
        response += (
            f"• {r['Symbol']} | Price: ₹{r['Close']} | "
            f"Volume: {r['Volume']}\n"
        )

    response += (
        "\n💡 Tip: High-priced stocks often indicate strong fundamentals, "
        "brand value, and long-term investor confidence."
    )

    return response
