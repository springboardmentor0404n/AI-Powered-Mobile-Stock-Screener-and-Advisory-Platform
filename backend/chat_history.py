from datetime import datetime
from typing import List, Dict, Optional
from firebase_config import get_firestore

# Collection reference
def get_conversations_collection():
    """Get the conversations collection ref"""
    db = get_firestore()
    if not db:
        raise RuntimeError("Firestore not initialized")
    return db.collection("chat_conversations")

import asyncio
async def save_conversation(user_id: str, messages: List[Dict], title: Optional[str] = None) -> str:
    """
    Save a chat conversation to Firestore
    Returns conversation ID
    """
    try:
        conversations_ref = get_conversations_collection()
        
        # Generate title from first user message if not provided
        if not title:
            first_user_msg = next((msg for msg in messages if msg.get('role') == 'user'), None)
            if first_user_msg:
                # Handle both dict access or object access if necessary, assuming dict from router
                content = first_user_msg.get('content', '') or first_user_msg.get('text', '')
                title = content[:50] + ('...' if len(content) > 50 else '')
            else:
                title = "New Conversation"
        
        conversation = {
            "user_id": str(user_id), # Ensure string for Firestore
            "title": title,
            "messages": messages,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Add new document (Sync call wrapped in thread)
        def add_doc():
            update_time, doc_ref = conversations_ref.add(conversation)
            return doc_ref.id

        return await asyncio.to_thread(add_doc)
        
    except Exception as e:
        print(f"[CHAT HISTORY] Error saving conversation: {e}")
        return ""

async def get_user_conversations(user_id: str, limit: int = 50) -> List[Dict]:
    """
    Get all conversations for a user
    """
    try:
        conversations_ref = get_conversations_collection()
        
        def fetch_docs():
            query = conversations_ref.where("user_id", "==", str(user_id))\
                .order_by("updated_at", direction="DESCENDING")\
                .limit(limit)
            return list(query.stream())
            
        docs = await asyncio.to_thread(fetch_docs)
        
        conversations = []
        for doc in docs:
            data = doc.to_dict()
            conversations.append({
                "id": doc.id,
                "title": data.get("title", "Untitled"),
                "message_count": len(data.get("messages", [])),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
            })
        
        return conversations
    except Exception as e:
        print(f"[CHAT HISTORY] Error fetching conversations: {e}")
        return []

async def get_conversation(conversation_id: str, user_id: str) -> Optional[Dict]:
    """
    Get a specific conversation by ID
    """
    try:
        conversations_ref = get_conversations_collection()
        
        def fetch_doc():
            doc_ref = conversations_ref.document(conversation_id)
            return doc_ref.get()
            
        doc = await asyncio.to_thread(fetch_doc)
        
        if doc.exists:
            data = doc.to_dict()
            # Verify ownership
            if str(data.get("user_id")) == str(user_id):
                return {
                    "id": doc.id,
                    "title": data.get("title", "Untitled"),
                    "messages": data.get("messages", []),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                }
        return None
    except Exception as e:
        print(f"[CHAT HISTORY] Error getting conversation: {e}")
        return None

async def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """
    Delete a conversation
    """
    try:
        conversations_ref = get_conversations_collection()
        
        def delete_doc():
            doc_ref = conversations_ref.document(conversation_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                if str(data.get("user_id")) == str(user_id):
                    doc_ref.delete()
                    return True
            return False

        return await asyncio.to_thread(delete_doc)
    except Exception as e:
        print(f"[CHAT HISTORY] Error deleting conversation: {e}")
        return False

