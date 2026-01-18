import requests
import time

try:
    response = requests.get('http://127.0.0.1:8000/docs', timeout=5)
    print(f"Server is running! Status code: {response.status_code}")
except requests.exceptions.RequestException as e:
    print(f"Server is not running or not accessible: {e}")