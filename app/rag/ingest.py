import pandas as pd
from app.state import DATA_STORE

def ingest_excel(path):
    df = pd.read_excel(path)
    DATA_STORE["df"] = df
    DATA_STORE["source"] = "default"
