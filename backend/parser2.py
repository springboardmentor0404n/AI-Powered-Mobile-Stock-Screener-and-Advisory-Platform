import pandas as pd
from sqlalchemy import create_engine
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import PGVector
import os

# 1. Configuration
CONNECTION_STRING = "postgresql://postgres:Admin@localhost:5432/stockdb"
TABLE_NAME = "stock_screener_dataset"
COLLECTION_NAME = "stock_full_analysis_hf2"

def build_rag_system():
    try:
        # --- STEP 1: FETCH DATA ---
        engine = create_engine(CONNECTION_STRING)
        query = f"SELECT * FROM {TABLE_NAME}"
        df = pd.read_sql(query, engine)
        print(f"Loaded {len(df)} rows from PostgreSQL.")

        # --- STEP 2: LOAD DOCUMENTS ---
        documents = []
        for _, row in df.iterrows():
            items = [f"{col.replace('_', ' ').title()}: {row[col]}" for col in df.columns]
            full_content = ". ".join(items)
            metadata = {"symbol": str(row.get('symbol', '')), "sector": str(row.get('sector', ''))}
            documents.append(Document(page_content=full_content, metadata=metadata))

        # --- STEP 3: CHUNKING ---
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitter.split_documents(documents)
        print(f"Split into {len(docs)} chunks.")

        # --- STEP 4: INITIALIZE EMBEDDINGS ---
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        # --- STEP 5: STORE IN BATCHES ---
        vector_db = PGVector.from_documents(
            embedding=embeddings,
            documents=[docs[0]], # Initialize with the first doc
            collection_name=COLLECTION_NAME,
            connection_string=CONNECTION_STRING,
            pre_delete_collection=True 
        )

        # Batching loop for the remaining docs
        batch_size = 500  # Adjust based on your RAM (500-1000 is usually safe)
        total_docs = len(docs)
        
        print(f"Starting batch upload...")
        # Start from index 1 since we used docs[0] for initialization
        for i in range(1, total_docs, batch_size):
            batch = docs[i : i + batch_size]
            vector_db.add_documents(batch)
            print(f"Successfully uploaded: {min(i + batch_size, total_docs)} / {total_docs} chunks")

        print("✅ Success! All batches embedded and stored.")
        return vector_db

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    db = build_rag_system()