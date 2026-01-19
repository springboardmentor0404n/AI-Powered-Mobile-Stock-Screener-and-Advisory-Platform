import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

def execute(query: str, params: dict = None):
    with engine.begin() as conn:
        conn.execute(text(query), params or {})

def fetch_one(query: str, params: dict = None):
    with engine.begin() as conn:
        result = conn.execute(text(query), params or {})
        row = result.mappings().fetchone()
        return dict(row) if row else None

def fetch_all(query: str, params: dict = None):
    with engine.begin() as conn:
        result = conn.execute(text(query), params or {})
        return [dict(r) for r in result.mappings().fetchall()]
