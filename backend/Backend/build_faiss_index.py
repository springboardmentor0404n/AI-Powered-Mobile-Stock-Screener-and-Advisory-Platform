import pandas as pd
from sentence_transformers import SentenceTransformer
import psycopg2
import faiss
import pickle
import numpy as np

# -----------------------------

# 1. Load dataset
# -----------------------------
df = pd.read_csv(r"C:\Users\srish\Downloads\Backend\data\merged_file.csv")

# -----------------------------
# 2. Load embedding model
# -----------------------------
model = SentenceTransformer('all-MiniLM-L6-v2')
dimension = 384  # MiniLM output dimension

# -----------------------------
# 3. Create FAISS index
# -----------------------------
index = faiss.IndexFlatL2(dimension)

# -----------------------------
# 4. Connect to PostgreSQL

# 1. Load dataset from PostgreSQL

# -----------------------------
conn = psycopg2.connect(
    dbname="stock_data",
    user="postgres",
    password="rishitha",

    host="localhost"
)
cur = conn.cursor()

id_mapping = []
all_embeddings = []  # store embeddings for inspection

# -----------------------------
# 5. Process each row
# -----------------------------
for _, row in df.iterrows():
    content = (
        f"Series: {row['SERIES']}, Date: {row['TIMESTAMP']}, "
        f"Open: {row['OPEN']}, High: {row['HIGH']}, Low: {row['LOW']}, Close: {row['CLOSE']}, "
        f"Return on Equity: {row['Return on Equity']}, "
        f"Profit Margin: {row['Profit Margin']}, "
        f"Trailing P/E: {row['Trailing P/E']}, Price/Sales: {row['Price/Sales']}, "
        f"Price/Book: {row['Price/Book']}, PEG: {row['PEG']}, Forward P/E: {row['Forward P/E']}"
    )

    # Insert metadata into PostgreSQL
    cur.execute(
        "INSERT INTO cleaned_stock_data (symbol, content) VALUES (%s, %s) RETURNING id",
        (row['SERIES'], content)
    )
    record_id = cur.fetchone()[0]
    id_mapping.append(record_id)

    # Generate embedding
    embedding = model.encode(content)
    index.add(embedding.reshape(1, -1))

    # Store embedding for inspection
    all_embeddings.append(embedding)

    # Print first 10 values of embedding for demo
    print("First embedding (first 10 values):", all_embeddings[0][:10], "...")
print("FAISS index total vectors:", index.ntotal)

# -----------------------------
# 6. Convert embeddings to NumPy array (for inspection)
# -----------------------------
all_embeddings = np.array(all_embeddings)
print("All embeddings shape:", all_embeddings.shape)
print("First embedding (first 10 values):", all_embeddings[0][:10], "...")

# -----------------------------
# 7. Demo nearest neighbor query
# -----------------------------
query_embedding = model.encode(df.iloc[0]['SERIES'])
k = 3
distances, indices = index.search(query_embedding.reshape(1, -1), k)
print("Nearest neighbor indices in FAISS:", indices)
print("Distances:", distances)

# Map FAISS indices back to PostgreSQL IDs and show metadata
for idx in indices[0]:
    db_id = id_mapping[idx]
    cur.execute("SELECT symbol, content FROM cleaned_stock_data WHERE id = %s", (db_id,))
    result = cur.fetchone()
    print(f"DB ID {db_id}: {result[0]}")

# -----------------------------
# 8. Save FAISS index & ID mapping
# -----------------------------
conn.commit()
conn.close()

faiss.write_index(index, "stock_index.faiss")

with open("id_mapping.pkl", "wb") as f:
    pickle.dump(id_mapping, f)

print("✅ FAISS index built and metadata stored successfully")
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

