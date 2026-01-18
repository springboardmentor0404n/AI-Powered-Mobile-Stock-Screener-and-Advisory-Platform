import google.generativeai as genai

# Set your API key
genai.api_key = "YOUR_API_KEY"

# List all available models
models = genai.list_models()
for model in models:
    print(model)
