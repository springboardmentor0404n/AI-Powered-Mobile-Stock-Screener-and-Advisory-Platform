import json
from app.database.postgres import get_connection

def store_embeddings(embeddings, metadata):
    print("Saving embeddings:", len(embeddings))

    conn = get_connection()
    cursor = conn.cursor()

    for emb, meta in zip(embeddings, metadata):
        cursor.execute(
            """
            INSERT INTO stock_embeddings (embedding, metadata)
            VALUES (%s, %s)
            """,
            (emb, json.dumps(meta))
        )

    conn.commit()
    cursor.close()
    conn.close()