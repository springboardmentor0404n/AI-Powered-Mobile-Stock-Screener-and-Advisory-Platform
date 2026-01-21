
import os
import sys
# Ensure backend is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.firebase_config import initialize_firebase, get_firestore

def test_firebase():
    print("Initializing Firebase...")
    if not initialize_firebase():
        print("❌ Initialization failed!")
        return

    try:
        db = get_firestore()
        print("✅ DB Client obtained")
        
        # Test Write
        print("Attempting write to 'test_collection'...")
        doc_ref = db.collection("test_collection").add({"test": True, "time": "now"})
        print(f"✅ Write successful! Doc ID: {doc_ref[1].id}")
        
        # Cleanup
        print("Cleaning up...")
        doc_ref[1].delete()
        print("✅ Cleanup successful")
        
    except Exception as e:
        print(f"❌ Operation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_firebase()
