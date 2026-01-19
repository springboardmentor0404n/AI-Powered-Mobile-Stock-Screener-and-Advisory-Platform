import os
import pandas as pd
from sentence_transformers import SentenceTransformer
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

EXCEL_PATH = os.getenv("EXCEL_PATH")
VECTOR_PATH = "vectorstore"

os.makedirs(VECTOR_PATH, exist_ok=True)

print("📄 Loading data:", EXCEL_PATH)

if EXCEL_PATH.endswith(".csv"):
    df = pd.read_csv(EXCEL_PATH)
else:
    df = pd.read_excel(EXCEL_PATH)

documents = []
for _, row in df.iterrows():
    text = " | ".join(row.astype(str))
    documents.append(Document(page_content=text))

print("🧠 Creating LOCAL embeddings (one-time)")

model = SentenceTransformer("all-MiniLM-L6-v2")

class LocalEmbeddings:
    def embed_documents(self, texts):
        return model.encode(texts, convert_to_numpy=True)

    def embed_query(self, text):
        return model.encode([text], convert_to_numpy=True)[0]

embeddings = LocalEmbeddings()

vectorstore = FAISS.from_documents(documents, embeddings)
vectorstore.save_local(VECTOR_PATH)

print(f"✅ Vectorstore saved with {len(documents)} rows")
