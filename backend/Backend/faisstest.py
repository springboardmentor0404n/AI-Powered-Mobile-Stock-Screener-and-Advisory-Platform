import faiss
import pickle
import numpy as np

import faiss
import pickle
from sentence_transformers import SentenceTransformer
import numpy as np

# Load FAISS index
index = faiss.read_index("stock_index.faiss")

# Load ID mapping
with open("id_mapping.pkl", "rb") as f:
    id_mapping = pickle.load(f)

# Load embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

# Test query
query = "finance stocks"  # any query you want
query_embedding = embedding_model.encode(query, convert_to_numpy=True).astype("float32").reshape(1, -1)

# FAISS search
k = 3
distances, indices = index.search(query_embedding, k)
print("FAISS indices:", indices)
print("FAISS distances:", distances)

# Check ID mapping
print("ID mapping length:", len(id_mapping))
print("First 5 IDs:", id_mapping[:5])

