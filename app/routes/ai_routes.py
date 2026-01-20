from fastapi import APIRouter, Depends
from ..security import get_current_user

from ..rag.retriever import retrieve_context
from ..rag.gemini_llm import generate_answer
from ..rag.numeric_handler import handle_numeric_query

router = APIRouter()


@router.post("/chat")
def chat(query: str, user=Depends(get_current_user)):
    # 1️⃣ Try numeric handler first
    numeric_answer = handle_numeric_query(query)
    if numeric_answer:
        return {
            "user": user["sub"],
            "query": query,
            "answer": numeric_answer,
            "source": "computed"
        }

    # 2️⃣ Otherwise use RAG
    context = retrieve_context(query)
    answer = generate_answer(context, query)

    return {
        "user": user["sub"],
        "query": query,
        "answer": answer,
        "source": "rag"
    }
@router.post("/chat")
def stock_chat(q: dict):
    msg = q["message"].lower()

    if "top gainer" in msg:
        return {"reply": "Use analytics top gainer endpoint"}

    return {"reply": "I can answer stock, market, portfolio questions"}
from fastapi import APIRouter

router = APIRouter()

@router.post("/chat/simple")
def simple_chat(payload: dict):
    message = payload.get("message", "").lower()

    if "hello" in message:
        return {"reply": "Hello! Ask me about stocks, market, or portfolio."}

    if "market" in message:
        return {"reply": "Market status is calculated based on price movement."}

    if "top gainer" in message:
        return {"reply": "Top gainer info is available in analytics section."}

    return {
        "reply": "I am your stock assistant. Try asking about market trends or portfolio."
    }
