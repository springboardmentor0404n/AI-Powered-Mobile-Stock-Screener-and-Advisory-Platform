import pandas as pd
from sqlalchemy import create_engine
import os

# 1. Load dataset
data_path = r"C:\Users\srish\Downloads\cleaned_stock_fundamental_data_nifty500.csv"
df = pd.read_csv(data_path)

# 2. Clean column names
df.columns = (
    df.columns.str.strip()
              .str.replace(' +', '_', regex=True)
              .str.replace('/', '_', regex=False)
              .str.replace('%', 'pct', regex=False)
              .str.replace('\.', '', regex=True)
)
# Optional extra cleaning
df.columns = df.columns.str.lower()
df.columns = df.columns.str.replace('__+', '_', regex=True)
df.columns = df.columns.str.replace('[^0-9a-z_]', '', regex=True)

# 3. Convert dates (if any)
date_cols = [col for col in df.columns if 'date' in col or 'year' in col]
for col in date_cols:
    df[col] = pd.to_datetime(df[col], errors='coerce')

# 4. Connect to PostgreSQL
engine = create_engine("postgresql+psycopg2://postgres:rishitha@localhost:5432/stock_data")

# 5. Insert into DB
df.to_sql('cleaned_stock_data1', engine, if_exists='replace', index=False)

print("✅ Dataset inserted successfully!")
