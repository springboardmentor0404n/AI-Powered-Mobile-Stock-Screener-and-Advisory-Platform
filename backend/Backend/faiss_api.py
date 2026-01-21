# faiss_api_gemini.py

import os
from dotenv import load_dotenv
load_dotenv()   # MUST be first

# Performance / CPU safety
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["TORCH_CPU_ALLOC_CONF"] = "max_split_size_mb:64"

from flask import Flask, request, jsonify
import faiss
import pickle
import psycopg2
import numpy as np
from sentence_transformers import SentenceTransformer

# Gemini (official SDK)
from google import genai

# -----------------------------
# 1. Flask app
# -----------------------------
app = Flask(__name__)

# -----------------------------
# 2. Gemini client
# -----------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found. Check your .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)

# -----------------------------
# 3. Load embedding model
# -----------------------------
embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    device="cpu"
)

# -----------------------------
# 4. Load FAISS index & mapping
# -----------------------------
index = faiss.read_index("stock_index.faiss")

with open("id_mapping_stock_name.pkl", "rb") as f:
    id_mapping = pickle.load(f)

# -----------------------------
# 5. PostgreSQL connection
# -----------------------------
conn = psycopg2.connect(
    dbname="stock_data",
    user="postgres",
    password="rishitha",
    host="localhost",
    port=5432
)
cur = conn.cursor()

# -----------------------------
# 6. Gemini analysis function
# -----------------------------
def generate_analysis(user_query, retrieved_chunks):
    if not retrieved_chunks:
        return "No relevant stock data found."

    context_text = "\n\n".join(
        [f"{r['stock_name']}: {r['content']}" for r in retrieved_chunks]
    )

    prompt = f"""
You are a stock advisory assistant.

User query:
{user_query}

Based on the following stock information, provide qualitative reasoning about
which stocks may be undervalued or overvalued.

Rules:
- Do NOT include numbers
- Do NOT include tables
- Do NOT include stock prices
- Only provide reasoning and insights

Data:
{context_text}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print("Gemini error:", e)
        return "Error generating analysis."

# -----------------------------
# 7. Health check
# -----------------------------
@app.route("/", methods=["GET"])
def health():
    return "FAISS + Gemini API running"

# -----------------------------
# 8. Semantic search endpoint
# -----------------------------
@app.route("/query", methods=["POST"])
def query_faiss():
    data = request.get_json(silent=True)

    if not data or "query" not in data:
        return jsonify({"error": "Query not provided"}), 400

    user_query = data["query"]

    # Step 1: Embed query
    try:
        query_embedding = embedding_model.encode(
            user_query,
            convert_to_numpy=True
        ).astype("float32").reshape(1, -1)
    except Exception as e:
        return jsonify({"error": f"Embedding failed: {str(e)}"}), 500

    # Step 2: FAISS search
    try:
        k = 3
        distances, indices = index.search(query_embedding, k)
    except Exception as e:
        return jsonify({"error": f"FAISS search failed: {str(e)}"}), 500

    # Step 3: Fetch records from PostgreSQL
    results = []
    for pos, idx in enumerate(indices[0]):
        try:
            stock_name = id_mapping[idx]
            cur.execute(
                "SELECT * FROM cleaned_stock_data1 WHERE stock_name = %s",
                (stock_name,)
            )
            record = cur.fetchone()

            if record:
                columns = [desc[0] for desc in cur.description]
                content = ", ".join(
                    f"{col}: {val}" for col, val in zip(columns, record)
                )

                results.append({
                    "stock_name": stock_name,
                    "content": content,
                    "distance": float(distances[0][pos])
                })
        except Exception as e:
            print(f"DB error for index {idx}:", e)

    # Step 4: Gemini analysis
    analysis_text = generate_analysis(user_query, results)

    # Step 5: Response
    return jsonify({
        "query": user_query,
        "results": results,
        "analysis": analysis_text
    })

# -----------------------------
# 9. Run server
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
