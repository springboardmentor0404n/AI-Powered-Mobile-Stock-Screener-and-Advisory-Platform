
import os
import sys
from dotenv import load_dotenv

# Load env from backend/.env
backend_env = os.path.join("backend", ".env")
load_dotenv(backend_env)

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
print(f"Using API Key: {api_key[:5]}...{api_key[-4:] if api_key else 'None'}")

if not api_key:
    print("❌ No API key found!")
    sys.exit(1)

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    
    print("\n[Listing Models...]")
    # The new SDK method to list models
    models = list(client.models.list())
    found = False
    for m in models:
        # Check if it supports generateContent
        if "generateContent" in (m.supported_actions or []):
            print(f" - {m.name} (Display: {m.display_name})")
            found = True
            
    if not found:
        print("No models found that support generateContent.")
        # Print all models just in case
        print("\nAll Models:")
        for m in models:
             print(f" - {m.name}")

except Exception as e:
    print(f"❌ Error listing models: {e}")
    import traceback
    traceback.print_exc()
