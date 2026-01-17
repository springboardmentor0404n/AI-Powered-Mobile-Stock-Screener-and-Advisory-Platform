import requests
import time

SYMBOL = "RELIANCE"
URL = f"http://localhost:5000/alerts/check/{SYMBOL}"

start = time.time()
response = requests.get(URL)
end = time.time()

data = response.json()

print("Symbol:", SYMBOL)
print("Alerts Checked:", data.get("alerts_checked"))
print("Alerts Triggered:", data.get("alerts_triggered"))
print("Processing Time:", round(end - start, 2), "seconds")
