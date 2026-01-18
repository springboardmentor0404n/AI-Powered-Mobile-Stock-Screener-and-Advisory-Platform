import pandas as pd

df = pd.read_csv("nifty_500_stats.csv", sep=";")
df.to_csv("cleaned_nifty_500.csv", index=False)

print("CSV Cleaning Done! Saved as cleaned_nifty_500.csv")
