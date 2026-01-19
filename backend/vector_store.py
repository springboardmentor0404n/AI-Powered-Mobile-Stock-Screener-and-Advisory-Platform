import os
import pickle
import faiss
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EMB_PATH = os.path.join(BASE_DIR, "embeddings.pkl")
INDEX_PATH = os.path.join(BASE_DIR, "stock_index.faiss")

embeddings = pickle.load(open(EMB_PATH, "rb"))

dim = embeddings.shape[1]
index = faiss.IndexFlatL2(dim)
index.add(np.array(embeddings))

faiss.write_index(index, INDEX_PATH)

print("✅ FAISS index created successfully")
