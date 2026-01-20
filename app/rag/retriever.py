from .vector_store import vectorstore

def retrieve_context(query: str):
    docs = vectorstore.similarity_search(query, k=4)
    print("🔍 Retrieved documents:")
    for d in docs:
     print(d.page_content[:300])
    return "\n".join([doc.page_content for doc in docs])

