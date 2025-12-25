# app/embeddings/embedder.py

from sentence_transformers import SentenceTransformer

# Load model once (important)
model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embeddings(records):
    """
    Generate local sentence embeddings using SentenceTransformers.
    No API, no quota, Infosys-safe.
    """
    texts = []

    for row in records:
        text = " ".join(str(v) for v in row.values())
        texts.append(text)

    embeddings = model.encode(texts)

    # Convert numpy array to list for DB storage
    return embeddings.tolist()
