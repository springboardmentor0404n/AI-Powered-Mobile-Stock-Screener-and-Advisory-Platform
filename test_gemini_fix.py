
import os
import sys
from backend.gemini_service import get_gemini_service
from google.genai import types

# Mock environment if needed, but we rely on existing .env loading in gemini_service
# Make sure we can import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

def test_chat():
    print("Testing GeminiService...")
    service = get_gemini_service()
    
    # Simulate the input causing validation error
    # Case 1: content is a dict
    bad_messages = [
        {"role": "user", "content": {"text": "Hello, this is a test with dict content"}}
    ]
    
    print("\n[TEST] Sending dict content...")
    try:
        response = service.chat_with_history(bad_messages)
        print(f"[SUCCESS] Response: {response[:50]}...")
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()

    # Case 2: parts usage (if applicable)
    bad_messages_2 = [
         {"role": "user", "parts": [{"text": "Hello via parts"}]}
    ]
    # Note: our code looks for 'content' key in messages, but 'parts' might be processed if existing history?
    # Our code: content = msg.get("content", "")
    
    # Case 3: Standard string
    print("\n[TEST] Sending string content...")
    good_messages = [
        {"role": "user", "content": "Hello, this is a normal test"}
    ]
    try:
        response = service.chat_with_history(good_messages)
        print(f"[SUCCESS] Response: {response[:50]}...")
    except Exception as e:
        print(f"[FAIL] Error: {e}")

if __name__ == "__main__":
    test_chat()
