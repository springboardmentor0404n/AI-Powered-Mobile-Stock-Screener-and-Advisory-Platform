import os
import firebase_admin
from firebase_admin import credentials, firestore
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Global instances
db = None

def initialize_firebase():
    """
    Initialize Firebase Admin SDK
    """
    global db
    
    try:
        # Check if already initialized
        if firebase_admin._apps:
            db = firestore.client()
            return True

        # 3. Check for specific user-provided file in backend or parent
        from pathlib import Path
        possible_paths = [
            "firebase-credentials.json", 
            "backend/firebase-credentials.json",
            "/etc/secrets/firebase-credentials.json", # Standard Render Secret Path
            "infy-1c95f-firebase-adminsdk-fbsvc-0283232c22.json",
            "../infy-1c95f-firebase-adminsdk-fbsvc-0283232c22.json"
        ]
        
        for p in possible_paths:
            if os.path.exists(p):
                cred = credentials.Certificate(p)
                firebase_admin.initialize_app(cred)
                logger.info(f"✅ Firebase initialized with credentials: {p}")
                db = firestore.client()
                return True

        # Check env var as fallback
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"✅ Firebase initialized with service account: {cred_path}")
        else:
            # Fallback to default Google Application Credentials
            logger.warning("⚠️ No specific credential file found, attempting default...")
            firebase_admin.initialize_app()
            logger.info("✅ Firebase initialized with default credentials")
            
        db = firestore.client()
        return True
        
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")
        return False
        
def get_firestore():
    """Get Firestore client instance"""
    if db is None:
        raise Exception("Firebase not initialized")
    return db
