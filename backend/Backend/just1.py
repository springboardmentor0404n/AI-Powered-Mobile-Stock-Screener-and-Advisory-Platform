import os
from google import genai

print("KEY FOUND:", os.getenv("GEMINI_API_KEY") is not None)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Say hello in one sentence"
)

print(response.text)
