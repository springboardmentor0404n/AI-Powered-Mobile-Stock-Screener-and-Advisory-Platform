from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List
from dependencies import get_current_user
import chat_history
from chat_service import get_chat_response
from query_validator import query_validator, ValidatedQuery

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class SaveConversationRequest(BaseModel):
    messages: List[dict]
    title: Optional[str] = None

class QueryValidationRequest(BaseModel):
    query: str

@router.post("/validate")
async def validate_query_endpoint(request: QueryValidationRequest):
    """Validate and normalize a user query before processing"""
    try:
        validated = query_validator.validate(request.query)
        return {
            "validated": True,
            "data": validated.dict()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@router.post("")
async def chat_endpoint(request: ChatRequest):
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message is required"
            )
        response = await get_chat_response(request.history or [], request.message)
        return {"response": response, "message": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_conversation_endpoint(request: SaveConversationRequest, current_user: dict = Depends(get_current_user)):
    """Save current chat conversation"""
    conversation_id = await chat_history.save_conversation(
        user_id=current_user["id"],
        messages=request.messages,
        title=request.title
    )
    return {"conversation_id": conversation_id, "message": "Conversation saved successfully"}

@router.get("/history")
async def get_chat_history_endpoint(current_user: dict = Depends(get_current_user)):
    """Get list of all saved conversations for current user"""
    conversations = await chat_history.get_user_conversations(user_id=current_user["id"])
    return {"conversations": conversations}

@router.get("/history/{conversation_id}")
async def get_conversation_endpoint(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Load a specific conversation"""
    conversation = await chat_history.get_conversation(
        conversation_id=conversation_id,
        user_id=current_user["id"]
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

@router.delete("/history/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a conversation"""
    success = await chat_history.delete_conversation(
        conversation_id=conversation_id,
        user_id=current_user["id"]
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or already deleted")
    
    return {"message": "Conversation deleted successfully"}
