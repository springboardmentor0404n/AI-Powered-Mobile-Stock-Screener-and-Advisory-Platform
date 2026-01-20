from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import PGVector

CONNECTION_STRING = "postgresql://postgres:123456789@localhost:5432/fastapi_auth_clean"

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = PGVector(
    connection_string=CONNECTION_STRING,
    collection_name="global_documents",
    embedding_function=embeddings
)
