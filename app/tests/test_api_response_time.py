import requests
import time

URL = "http://localhost:5000/analytics/today-stock/RELIANCE"

start = time.time()
response = requests.get(URL)
end = time.time()

print("Status Code:", response.status_code)
print("API Response Time:", round((end - start) * 1000, 2), "ms")
