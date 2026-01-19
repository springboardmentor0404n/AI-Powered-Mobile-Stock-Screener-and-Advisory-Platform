import os
import pandas as pd

# Build safe path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "indian_stocks.csv")

# Load dataset
df = pd.read_csv(DATA_PATH)

# Sort by date so latest record comes last
df = df.sort_values(by="Date")

# Create company-level dataset (latest record per company)
company_df = df.groupby("Symbol").last().reset_index()

# Keep only important columns
company_df = company_df[
    ["Symbol", "Open", "High", "Low", "Close", "Volume", "Deliverable Volume"]
]

print("Company-level dataset created")
print("Total companies:", len(company_df))
print(company_df.head())
# Save clean dataset
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "company_level_data.csv")
company_df.to_csv(OUTPUT_PATH, index=False)

print("\nSaved clean dataset to data/company_level_data.csv")
