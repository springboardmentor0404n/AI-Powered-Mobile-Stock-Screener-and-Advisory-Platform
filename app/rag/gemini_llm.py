# app/rag/gemini_llm.py
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ✅ EXACT model name from list_gemini_models.py
model = genai.GenerativeModel("models/gemini-flash-latest")

def generate_answer(context: str, question: str) -> str:
    prompt = f"""
You are an AI assistant. Use the context below to answer the question.

Context:
{context}

Question:
{question}

Answer clearly and concisely.
"""
    response = model.generate_content(prompt)
    return response.text
