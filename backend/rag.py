from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOC_FILE = os.path.join(BASE_DIR, "docs", "market_news.txt")

model = SentenceTransformer("all-MiniLM-L6-v2")

with open(DOC_FILE, "r", encoding="utf-8") as f:
    documents = [line.strip() for line in f if line.strip()]

embeddings = model.encode(documents)

index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(np.array(embeddings))

def rag_answer(query):
    q_emb = model.encode([query])
    _, I = index.search(np.array(q_emb), k=1)
    return documents[I[0][0]]
