import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "company_level_data.csv")

df = pd.read_csv(DATA_PATH)

# Simple screening rule
filtered = df[df["Close"] > 1000]

print("Stocks with Close price > 1000")
print(filtered[["Symbol", "Close"]])
