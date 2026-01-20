import faiss
import psycopg2
import pickle
from sentence_transformers import SentenceTransformer

# Load FAISS index
index = faiss.read_index("stock_index.faiss")

with open("id_mapping.pkl", "rb") as f:
    id_mapping = pickle.load(f)

model = SentenceTransformer('all-MiniLM-L6-v2')

conn = psycopg2.connect(
    dbname="stock_data",
    user="postgres",
    password="rishitha",
    host="localhost"
)
cur = conn.cursor()

def semantic_search(query, top_k=3):
    query_embedding = model.encode(query).reshape(1, -1)
    distances, indices = index.search(query_embedding, top_k)

    results = []
    for idx in indices[0]:
        record_id = id_mapping[idx]
        cur.execute(
            "SELECT symbol, content FROM cleaned_stock_data WHERE id=%s",
            (record_id,)
        )
        results.append(cur.fetchone())

    return results
