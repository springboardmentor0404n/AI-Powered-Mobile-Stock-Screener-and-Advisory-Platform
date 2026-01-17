import sys
import os
import time

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(ROOT_DIR)

from app.routes.analytics import get_csv_data

start = time.time()
data = get_csv_data("RELIANCE")
end = time.time()

print("CSV Records:", len(data))
print("CSV Processing Time:", round((end - start) * 1000, 2), "ms")
