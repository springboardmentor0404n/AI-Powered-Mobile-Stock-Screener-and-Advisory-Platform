import pandas as pd
import os

DATA_PATH = "app/data/uploads/stocks.csv"

def run_screener(filters):
    if not os.path.exists(DATA_PATH):
        return []

    df = pd.read_csv(DATA_PATH)

    for f in filters:
        field = f["field"]
        op = f["operator"]
        val = f["value"]

        if field not in df.columns:
            continue

        if op == "<":
            df = df[df[field] < val]
        elif op == ">":
            df = df[df[field] > val]
        elif op == "==":
            df = df[df[field] == val]
        elif op == "<=":
            df = df[df[field] <= val]
        elif op == ">=":
            df = df[df[field] >= val]

    return df.head(20).to_dict(orient="records")
