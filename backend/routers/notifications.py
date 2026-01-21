"""
Notification API Routes
Handles notification management and push notification registration
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from dependencies import get_current_user
from notification_service import notification_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Request/Response Models
class PushTokenRequest(BaseModel):
    expo_push_token: str

class NotificationPreferencesRequest(BaseModel):
    news_enabled: Optional[bool] = True
    alerts_enabled: Optional[bool] = True
    market_updates_enabled: Optional[bool] = True
    daily_summary_time: Optional[str] = "09:30"  # IST time

class MarkReadRequest(BaseModel):
    notification_id: int

class TestNotificationRequest(BaseModel):
    title: str
    body: str
    type: Optional[str] = "test"

@router.post("/register-token")
async def register_push_token(
    request: PushTokenRequest,
    current_user = Depends(get_current_user)
):
    """Register user's Expo push notification token"""
    try:
        success = await notification_service.save_push_token(
            user_id=current_user["id"],
            expo_push_token=request.expo_push_token
        )
        
        if success:
            return {
                "success": True,
                "message": "Push token registered successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to register push token")
            
    except Exception as e:
        logger.error(f"Register token error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_notifications(
    limit: int = Query(50, le=100),
    unread_only: bool = Query(False),
    current_user = Depends(get_current_user)
):
    """Get user's notifications"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user["id"],
            limit=limit,
            unread_only=unread_only
        )
        
        return {
            "notifications": notifications,
            "count": len(notifications)
        }
        
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-read")
async def mark_notification_read(
    request: MarkReadRequest,
    current_user = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        success = await notification_service.mark_as_read(
            notification_id=request.notification_id,
            user_id=current_user["id"]
        )
        
        if success:
            return {"success": True, "message": "Notification marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        logger.error(f"Mark read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user = Depends(get_current_user)
):
    """Mark all notifications as read"""
    try:
        success = await notification_service.mark_all_as_read(current_user["id"])
        
        if success:
            return {"success": True, "message": "All notifications marked as read"}
        else:
            raise HTTPException(status_code=500, detail="Failed to mark all as read")
            
    except Exception as e:
        logger.error(f"Mark all read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences")
async def get_notification_preferences(
    current_user = Depends(get_current_user)
):
    """Get user's notification preferences"""
    try:
        if not notification_service.storage:
            raise HTTPException(status_code=500, detail="Storage not available")
        
        preferences = await notification_service.storage.get_notification_preferences(
            current_user["id"]
        )
        
        return preferences or {
            "news_enabled": True,
            "alerts_enabled": True,
            "market_updates_enabled": True,
            "daily_summary_time": "09:30"
        }
        
    except Exception as e:
        logger.error(f"Get preferences error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preferences")
async def update_notification_preferences(
    request: NotificationPreferencesRequest,
    current_user = Depends(get_current_user)
):
    """Update user's notification preferences"""
    try:
        success = await notification_service.update_notification_preferences(
            user_id=current_user["id"],
            preferences=request.dict(exclude_unset=True)
        )
        
        if success:
            return {
                "success": True,
                "message": "Preferences updated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update preferences")
            
    except Exception as e:
        logger.error(f"Update preferences error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def send_test_notification(
    request: TestNotificationRequest,
    current_user = Depends(get_current_user)
):
    """Send a test notification (for debugging)"""
    try:
        # Create in-app notification
        notification = await notification_service.create_notification(
            user_id=current_user["id"],
            title=request.title,
            body=request.body,
            notification_type=request.type
        )
        
        # Try to send push notification
        if notification_service.storage:
            user_prefs = await notification_service.storage.get_notification_preferences(
                current_user["id"]
            )
            if user_prefs and user_prefs.get("expo_push_token"):
                push_result = await notification_service.send_push_notification(
                    expo_push_token=user_prefs["expo_push_token"],
                    title=request.title,
                    body=request.body,
                    data={"type": request.type}
                )
                notification["push_result"] = push_result
        
        return {
            "success": True,
            "notification": notification
        }
        
    except Exception as e:
        logger.error(f"Test notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user)
):
    """Get count of unread notifications"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user["id"],
            unread_only=True
        )
        
        return {
            "count": len(notifications)
        }
        
    except Exception as e:
        logger.error(f"Unread count error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
