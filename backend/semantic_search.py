import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMB_PATH = os.path.join(BASE_DIR, "embeddings.pkl")

with open(EMB_PATH, "rb") as f:
    data = pickle.load(f)

symbols = data["symbols"]
vectors = np.array(data["embeddings"])

model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_search(query, top_k=10):
    q_vec = model.encode([query])
    sims = cosine_similarity(q_vec, vectors)[0]
    idx = sims.argsort()[-top_k:][::-1]

    return [
        {"symbol": symbols[i], "score": float(sims[i])}
        for i in idx
    ]
