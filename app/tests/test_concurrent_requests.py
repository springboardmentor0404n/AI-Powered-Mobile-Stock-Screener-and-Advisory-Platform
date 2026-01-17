import concurrent.futures
import requests

URL = "http://localhost:5000/analytics/market-status"

def hit_api(_):
    return requests.get(URL).status_code

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(hit_api, range(10)))

print("Concurrent Responses:", results)
