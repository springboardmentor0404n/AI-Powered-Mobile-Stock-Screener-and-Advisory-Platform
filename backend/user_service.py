"""
User Service Layer using Firebase
Handles User Profiles, Portfolios, and Activity Logs.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging
from firebase_config import get_firestore
from firebase_admin import firestore

logger = logging.getLogger(__name__)

class UserService:
    """
    Service layer for User operations with Firebase.
    """
    
    def __init__(self):
        # We fetch db lazily
        pass

    def _get_db(self):
        return get_firestore()

    # ========================================================================
    # PORTFOLIO HISTORY
    # ========================================================================
    
    async def insert_portfolio_snapshot(self, user_id: str, portfolio_data: dict, timestamp: Optional[datetime] = None) -> bool:
        """
        Insert portfolio snapshot
        """
        try:
            db = self._get_db()
            time_val = timestamp or datetime.now()
            
            # Store in subcollection: users/{user_id}/portfolio_history/{timestamp}
            snapshot = {
                "timestamp": time_val,
                "data": portfolio_data,
                "created_at": firestore.SERVER_TIMESTAMP
            }
            
            import asyncio
            # Create a document in subcollection
            await asyncio.to_thread(
                db.collection("users").document(user_id)
                  .collection("portfolio_history").add, snapshot
            )
            
            return True
        except Exception as e:
            logger.error(f"[Firebase] Insert portfolio snapshot error: {e}")
            return False

    async def get_portfolio_history(self, user_id: str, days: int = 30) -> List[Dict]:
        """
        Get portfolio history for user
        """
        try:
            import asyncio
            start_date = datetime.now() - timedelta(days=days)
            
            def fetch():
                db = self._get_db()
                docs = db.collection("users").document(user_id)\
                         .collection("portfolio_history")\
                         .where("timestamp", ">=", start_date)\
                         .order_by("timestamp", direction=firestore.Query.DESCENDING)\
                         .stream()
                return [doc.to_dict() for doc in docs]

            from datetime import timedelta
            return await asyncio.to_thread(fetch)
            
        except Exception as e:
            logger.error(f"[Firebase] Get portfolio history error: {e}")
            return []

    # ========================================================================
    # USER ACTIVITY ANALYTICS
    # ========================================================================
    
    async def log_user_activity(self, user_id: Optional[str], activity_type: str, details: dict) -> bool:
        """
        Log user activity
        """
        try:
            db = self._get_db()
            
            activity = {
                "user_id": user_id,
                "type": activity_type,
                "details": details,
                "timestamp": firestore.SERVER_TIMESTAMP
            }
            
            import asyncio
            # Add to root 'activity_logs' collection or user subcollection?
            # Root is better for global analytics.
            await asyncio.to_thread(
                db.collection("activity_logs").add, activity
            )
            
            return True
        except Exception as e:
            logger.error(f"[Firebase] Log activity error: {e}")
            return False

    async def get_activity_summary(self, hours: int = 24) -> List[Dict]:
        """
        Get activity summary
        """
        # Complex aggregation is harder in Firestore than SQL.
        # We might just return raw logs or simple counts if implemented.
        # For now, return empty or implement basic fetch.
        return []



    # ========================================================================
    # USER MANAGEMENT & AUTH
    # ========================================================================
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        try:
            import asyncio
            db = self._get_db()
            
            def fetch():
                docs = db.collection("users").where("email", "==", email).limit(1).stream()
                for doc in docs:
                    data = doc.to_dict()
                    data["id"] = doc.id  # Use document ID as user ID
                    return data
                return None
                
            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"[Firebase] Get user by email error: {e}")
            return None

    async def create_user(self, email: str, username: str, password_hash: str, full_name: str, is_admin: bool = False) -> Optional[str]:
        """Create new user"""
        try:
            import asyncio
            db = self._get_db()
            
            user_data = {
                "email": email,
                "username": username,
                "password_hash": password_hash,
                "full_name": full_name,
                "is_admin": is_admin,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
                "is_active": True,
                "role": "admin" if is_admin else "user"
            }
            
            def create():
                # Check existance first? (Auth router handles it, but safety check ok)
                # We let Firestore generate ID
                update_time, doc_ref = db.collection("users").add(user_data)
                return doc_ref.id
                
            return await asyncio.to_thread(create)
        except Exception as e:
            logger.error(f"[Firebase] Create user error: {e}")
            return None

    async def update_user(self, user_id: str, updates: Dict) -> bool:
        """Update user profile"""
        try:
            import asyncio
            db = self._get_db()
            
            def update():
                doc_ref = db.collection("users").document(str(user_id))
                # Add updated_at
                if "updated_at" not in updates:
                    updates["updated_at"] = firestore.SERVER_TIMESTAMP
                
                doc_ref.update(updates)
                return True
                
            return await asyncio.to_thread(update)
        except Exception as e:
            logger.error(f"[Firebase] Update user error: {e}")
            return False

    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        try:
            import asyncio
            db = self._get_db()
            
            def fetch():
                doc_ref = db.collection("users").document(str(user_id))
                doc = doc_ref.get()
                if doc.exists:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    return data
                return None
                
            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"[Firebase] Get user error: {e}")
            return None

    # ========================================================================
    # WATCHLIST MANAGEMENT
    # ========================================================================

    async def get_watchlist(self, user_id: int) -> List[Dict]:
        """Get user watchlist"""
        try:
            import asyncio
            db = self._get_db()
            
            # Fetch from users/{uid}/watchlist or separate collection
            # Let's use subcollection "watchlist"
            
            # First need to find the user doc if we don't have the firebase auth UID
            # If user_id is the legacy int ID, we query user doc first.
            
            user = await self.get_user_by_id(user_id)
            if not user:
                return []
                
            # If we found the user, use that doc ref. 
            # BUT wait, get_user_by_id returned dict. We need the doc ID to query subcollection?
            # Or we just query a top level 'watchlists' collection with user_id field.
            # Top level is easier for migration.
            
            def fetch():
                docs = db.collection("watchlists").where("user_id", "==", user_id).stream()
                return [doc.to_dict() for doc in docs]
                
            return await asyncio.to_thread(fetch)
            
        except Exception as e:
            logger.error(f"[Firebase] Get watchlist error: {e}")
            return []

    async def add_to_watchlist(self, user_id: int, symbol: str, exchange: str = "NSE") -> bool:
        """Add to watchlist"""
        try:
            import asyncio
            db = self._get_db()
            
            data = {
                "user_id": user_id,
                "symbol": symbol,
                "exchange": exchange,
                "added_at": firestore.SERVER_TIMESTAMP
            }
            
            # Use composite ID to prevent duplicates
            doc_id = f"{user_id}_{symbol}_{exchange}"
            
            await asyncio.to_thread(
                db.collection("watchlists").document(doc_id).set, data
            )
            return True
        except Exception as e:
            logger.error(f"[Firebase] Add to watchlist error: {e}")
            return False

    async def remove_from_watchlist(self, user_id: int, symbol: str) -> bool:
        """Remove from watchlist"""
        try:
            import asyncio
            db = self._get_db()
            
            # Need to find the doc or construct ID
            # If we strictly use NSE default in add, we might miss if exchange differs.
            # But usually it is NSE. 
            # Ideally we query to delete.
            
            def delete():
                docs = db.collection("watchlists")\
                         .where("user_id", "==", user_id)\
                         .where("symbol", "==", symbol)\
                         .stream()
                deleted = False
                for doc in docs:
                    doc.reference.delete()
                    deleted = True
                return deleted

            return await asyncio.to_thread(delete)
        except Exception as e:
            logger.error(f"[Firebase] Remove from watchlist error: {e}")
            return False
    
    async def update_one(self, query: dict, update: dict):
        """Generic update (legacy support wrapper)"""
        # Support for notes update: {"user_id": uid, "symbol": sym}, {"$set": {"notes": val}}
        try:
            user_id = query.get("user_id")
            symbol = query.get("symbol")
            
            if not user_id or not symbol:
                return None
                
            # Find doc
            import asyncio
            def update_doc():
                db = self._get_db()
                docs = db.collection("watchlists")\
                         .where("user_id", "==", user_id)\
                         .where("symbol", "==", symbol)\
                         .limit(1).stream()
                
                count = 0
                for doc in docs:
                    # Parse mongo-style update {"$set": {...}}
                    updates = update.get("$set", {})
                    doc.reference.update(updates)
                    count += 1
                
                # Mock result object with modified_count
                class Result:
                    modified_count = count
                return Result()

            return await asyncio.to_thread(update_doc)
            
        except Exception as e:
            logger.error(f"[Firebase] Generic update error: {e}")
            class Result:
                modified_count = 0
            return Result()

    # ========================================================================
    # NOTIFICATION STORAGE
    # ========================================================================

    async def save_push_token(self, user_id: int, expo_push_token: str) -> bool:
        """Save Expo push token for user"""
        try:
            import asyncio
            db = self._get_db()
            
            def update():
                # We assume user_id is the document ID string. If it's an int, we need mapping.
                # The auth system seems to use string IDs (from firebase auth or generated).
                # But the type hint says int? Let's cast to str to be safe as Firestore uses string keys.
                doc_ref = db.collection("users").document(str(user_id))
                
                # Check if doc exists, if not create partial
                doc = doc_ref.get()
                if not doc.exists:
                    doc_ref.set({
                        "expo_push_token": expo_push_token,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    }, merge=True)
                else:
                    doc_ref.update({
                        "expo_push_token": expo_push_token,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    })
                return True
                
            return await asyncio.to_thread(update)
        except Exception as e:
            logger.error(f"[Firebase] Save push token error: {e}")
            return False

    async def get_users_with_push_enabled(self) -> List[Dict]:
        """Get all users who have a push token"""
        try:
            import asyncio
            db = self._get_db()
            
            def fetch():
                # Query users where expo_push_token is not null/empty
                # Firestore doesn't map "is not null" easily, usually check existence
                # We can verify token existence in code or use ordering hack
                docs = db.collection("users").order_by("expo_push_token").stream()
                
                users = []
                for doc in docs:
                    data = doc.to_dict()
                    if data.get("expo_push_token"):
                        data["id"] = doc.id
                        users.append(data)
                return users

            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"[Firebase] Get push users error: {e}")
            return []

    async def save_notification(self, notification: Dict) -> str:
        """Save notification to user's subcollection"""
        try:
            import asyncio
            db = self._get_db()
            user_id = notification.get("user_id")
            if not user_id:
                return None

            def save():
                # Clean up data for firestore (no None keys)
                doc_ref = db.collection("users").document(str(user_id))\
                            .collection("notifications").document()
                
                notification["id"] = doc_ref.id
                doc_ref.set(notification)
                return doc_ref.id

            return await asyncio.to_thread(save)
        except Exception as e:
            logger.error(f"[Firebase] Save notification error: {e}")
            return None

    async def get_user_notifications(self, user_id: int, limit: int = 50, unread_only: bool = False) -> List[Dict]:
        """Get notifications for user"""
        try:
            import asyncio
            db = self._get_db()
            
            def fetch():
                ref = db.collection("users").document(str(user_id))\
                        .collection("notifications")
                
                if unread_only:
                    ref = ref.where("read", "==", False)
                
                query = ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
                docs = query.stream()
                
                return [{**doc.to_dict(), "id": doc.id} for doc in docs]

            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"[Firebase] Get notifications error: {e}")
            return []

    async def mark_notification_read(self, notification_id: int, user_id: int) -> bool:
        """Mark single notification as read"""
        try:
            import asyncio
            db = self._get_db()
            
            def update():
                # notification_id might be int or str. Firestore IDs are strings.
                doc_ref = db.collection("users").document(str(user_id))\
                            .collection("notifications").document(str(notification_id))
                
                doc_ref.update({"read": True})
                return True

            return await asyncio.to_thread(update)
        except Exception as e:
            logger.error(f"[Firebase] Mark read error: {e}")
            return False

    async def mark_all_notifications_read(self, user_id: int) -> bool:
        """Mark all notifications as read"""
        try:
            import asyncio
            db = self._get_db()
            
            def update_all():
                batch = db.batch()
                ref = db.collection("users").document(str(user_id))\
                        .collection("notifications").where("read", "==", False)
                
                docs = ref.stream()
                count = 0
                for doc in docs:
                    batch.update(doc.reference, {"read": True})
                    count += 1
                    
                    if count >= 400: # Firestore batch limit is 500
                        batch.commit()
                        batch = db.batch()
                        count = 0
                
                if count > 0:
                    batch.commit()
                return True

            return await asyncio.to_thread(update_all)
        except Exception as e:
            logger.error(f"[Firebase] Mark all read error: {e}")
            return False

    async def get_notification_preferences(self, user_id: int) -> Dict:
        """Get user notification preferences"""
        try:
            import asyncio
            db = self._get_db()
            
            def fetch():
                doc = db.collection("users").document(str(user_id)).get()
                if doc.exists:
                    return doc.to_dict().get("notification_preferences", {})
                return {}

            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"[Firebase] Get preferences error: {e}")
            return {}

    async def update_notification_preferences(self, user_id: int, preferences: Dict) -> bool:
        """Update notification preferences"""
        try:
            import asyncio
            db = self._get_db()
            
            def update():
                db.collection("users").document(str(user_id)).update({
                    "notification_preferences": preferences
                })
                return True

            return await asyncio.to_thread(update)
        except Exception as e:
            logger.error(f"[Firebase] Update preferences error: {e}")
            return False


# Global Instance
user_service = UserService()
