from openai import OpenAI
import os

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# List all available models
models = client.models.list()

for m in models.data:
    print(m.id)
