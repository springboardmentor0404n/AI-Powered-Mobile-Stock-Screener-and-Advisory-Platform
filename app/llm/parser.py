import os
import json
import google.generativeai as genai
from app.llm.prompt import PROMPT_TEMPLATE

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not set")

genai.configure(api_key=GOOGLE_API_KEY)


def parse_query(query: str) -> dict:
    """
    Convert natural language query into DSL JSON.
    Never crashes.
    """

    # ✅ SAFE placeholder replacement
    prompt = PROMPT_TEMPLATE.replace("{query}", query)

    # ✅ UPDATED MODEL NAME
    model = genai.GenerativeModel("models/gemini-1.5-flash")
    response = model.generate_content(prompt)

    raw = response.text.strip()
    print("\n🔍 RAW LLM OUTPUT:\n", raw)

    # Remove markdown fences
    if raw.startswith("```"):
        raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw)
        parsed.setdefault("filters", [])
        return parsed
    except Exception:
        print("⚠️ JSON parse failed — fallback used")
        return {
            "filters": [],
            "raw_text": raw
        }