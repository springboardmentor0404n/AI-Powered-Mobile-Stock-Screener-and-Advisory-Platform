# build_faiss_index_stock_name.py

import pandas as pd
from sentence_transformers import SentenceTransformer
import psycopg2
import faiss
import pickle
import numpy as np

# -----------------------------
# 1. Load dataset from PostgreSQL
# -----------------------------
conn = psycopg2.connect(
    dbname="stock_data",
    user="postgres",
    password="rishitha",
    host="localhost",
    port=5432
)
df = pd.read_sql("SELECT * FROM cleaned_stock_data1", conn)
conn.close()

print(f"✅ Loaded dataset with {len(df)} rows")

# -----------------------------
# 2. Load embedding model
# -----------------------------
model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
dimension = 384  # MiniLM-L6-v2 embedding size

# -----------------------------
# 3. Create FAISS index
# -----------------------------
index = faiss.IndexFlatL2(dimension)
print("✅ FAISS index created")

# -----------------------------
# 4. Build id_mapping using stock_name
# -----------------------------
id_mapping = []

for _, row in df.iterrows():
    # Create a combined "content" string from all columns dynamically
    content = ", ".join([f"{col}: {row[col]}" for col in df.columns])
    
    # Generate embedding
    embedding = model.encode(content, convert_to_numpy=True).astype("float32").reshape(1, -1)
    index.add(embedding)
    
    # Map FAISS vector to stock_name
    id_mapping.append(row['stock_name'])

print(f"✅ All embeddings added to FAISS index")
print(f"Total embeddings in FAISS: {index.ntotal}")

# -----------------------------
# 5. Save FAISS index & ID mapping
# -----------------------------
faiss.write_index(index, "stock_index_stock_name.faiss")
with open("id_mapping_stock_name.pkl", "wb") as f:
    pickle.dump(id_mapping, f)

print("✅ FAISS index and stock_name mapping saved successfully!")
