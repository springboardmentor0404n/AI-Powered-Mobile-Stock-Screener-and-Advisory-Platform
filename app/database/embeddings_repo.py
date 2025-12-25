import json
from app.database.postgres import get_connection

def save_embeddings_to_db(embeddings, metadata):
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