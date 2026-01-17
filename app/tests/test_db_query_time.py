import sys
import os
import time

# -------------------------------------------------
# Add project root to PYTHONPATH
# -------------------------------------------------
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from app.routes.analytics import get_csv_data

# -------------------------------------------------
# CSV Processing Performance Test
# -------------------------------------------------
SYMBOL = "RELIANCE"   # Must match cleaned_RELIANCE.csv

start = time.time()
data = get_csv_data(SYMBOL)
end = time.time()

print(f"Symbol: {SYMBOL}")
print("CSV Records:", len(data))
print("CSV Processing Time:", round((end - start) * 1000, 2), "ms")
