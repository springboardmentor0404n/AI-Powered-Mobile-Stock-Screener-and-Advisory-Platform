import requests
import time

USER_ID = 1
URL = f"http://localhost:5000/notifications/{USER_ID}?unread_only=true&limit=5"

start = time.time()
response = requests.get(URL)
end = time.time()

print("Status Code:", response.status_code)
print("Notifications Response Time:", round((end - start) * 1000, 2), "ms")
