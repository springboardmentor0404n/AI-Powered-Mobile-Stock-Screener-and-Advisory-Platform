"""
Notification Service for Stock Market News and Alerts
Handles both in-app notifications and push notifications
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import aiohttp
from models import NotificationPreference
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing notifications and push alerts"""
    
    def __init__(self, storage=None):
        self.storage = storage
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        
    async def create_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        notification_type: str = "news",
        data: Optional[Dict] = None,
        priority: str = "normal"
    ) -> Dict:
        """Create a notification record"""
        notification = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "type": notification_type,  # news, alert, price_change, market_update
            "data": data or {},
            "priority": priority,  # low, normal, high
            "read": False,
            "created_at": datetime.now().isoformat(),
        }
        
        # Save to database
        if self.storage:
            try:
                notification_id = await self.storage.save_notification(notification)
                notification["id"] = notification_id
            except Exception as e:
                logger.error(f"Failed to save notification: {e}")
        
        return notification
    
    async def send_push_notification(
        self,
        expo_push_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        badge: Optional[int] = None
    ) -> Dict:
        """Send push notification via Expo Push Notification service"""
        
        message = {
            "to": expo_push_token,
            "sound": sound,
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
            "channelId": "stock-alerts"
        }
        
        if badge is not None:
            message["badge"] = badge
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.expo_push_url,
                    json=message,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        logger.info(f"Push notification sent successfully: {title}")
                        return {"success": True, "result": result}
                    else:
                        logger.error(f"Push notification failed: {result}")
                        return {"success": False, "error": result}
                        
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_news_notification(
        self,
        user_id: int,
        news_item: Dict,
        send_push: bool = True
    ) -> Dict:
        """Send notification for a news item"""
        
        title = f"📰 {news_item.get('headline', 'Market News')}"
        body = news_item.get('summary', '')[:100] + "..."
        
        # Create in-app notification
        notification = await self.create_notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="news",
            data={
                "news_id": news_item.get("id"),
                "url": news_item.get("url"),
                "source": news_item.get("source"),
                "image": news_item.get("image")
            }
        )
        
        # Send push notification if enabled
        if send_push and self.storage:
            try:
                user_prefs = await self.storage.get_notification_preferences(user_id)
                if user_prefs and user_prefs.get("news_enabled", True):
                    push_token = user_prefs.get("expo_push_token")
                    if push_token:
                        await self.send_push_notification(
                            expo_push_token=push_token,
                            title="Market News",
                            body=news_item.get('headline', 'New market update'),
                            data={"type": "news", "news_id": news_item.get("id")}
                        )
            except Exception as e:
                logger.error(f"Failed to send push for news: {e}")
        
        return notification
    
    async def send_price_alert(
        self,
        user_id: int,
        symbol: str,
        current_price: float,
        trigger_price: float,
        alert_type: str = "above"
    ) -> Dict:
        """Send price alert notification"""
        
        direction = "🔼" if alert_type == "above" else "🔽"
        title = f"{direction} {symbol} Price Alert"
        body = f"{symbol} is now ₹{current_price:.2f} ({alert_type} your target ₹{trigger_price:.2f})"
        
        # Create in-app notification
        notification = await self.create_notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="price_alert",
            priority="high",
            data={
                "symbol": symbol,
                "current_price": current_price,
                "trigger_price": trigger_price,
                "alert_type": alert_type
            }
        )
        
        # Send push notification
        if self.storage:
            try:
                user_prefs = await self.storage.get_notification_preferences(user_id)
                if user_prefs and user_prefs.get("alerts_enabled", True):
                    push_token = user_prefs.get("expo_push_token")
                    if push_token:
                        await self.send_push_notification(
                            expo_push_token=push_token,
                            title=title,
                            body=body,
                            data={"type": "price_alert", "symbol": symbol},
                            sound="default",
                            badge=1
                        )
            except Exception as e:
                logger.error(f"Failed to send push for price alert: {e}")
        
        return notification
    
    async def send_market_update(
        self,
        user_id: int,
        market_summary: Dict
    ) -> Dict:
        """Send daily market summary notification"""
        
        nifty_change = market_summary.get("nifty_change_percent", 0)
        sensex_change = market_summary.get("sensex_change_percent", 0)
        
        direction = "📈" if nifty_change > 0 else "📉"
        title = f"{direction} Market Update"
        body = f"Nifty {nifty_change:+.2f}% | Sensex {sensex_change:+.2f}%"
        
        # Create in-app notification
        notification = await self.create_notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="market_update",
            data=market_summary
        )
        
        # Send push notification
        if self.storage:
            try:
                user_prefs = await self.storage.get_notification_preferences(user_id)
                if user_prefs and user_prefs.get("market_updates_enabled", True):
                    push_token = user_prefs.get("expo_push_token")
                    if push_token:
                        await self.send_push_notification(
                            expo_push_token=push_token,
                            title=title,
                            body=body,
                            data={"type": "market_update"}
                        )
            except Exception as e:
                logger.error(f"Failed to send push for market update: {e}")
        
        return notification
    
    async def get_user_notifications(
        self,
        user_id: int,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        if not self.storage:
            return []
        
        try:
            notifications = await self.storage.get_user_notifications(
                user_id=user_id,
                limit=limit,
                unread_only=unread_only
            )
            return notifications
        except Exception as e:
            logger.error(f"Failed to fetch notifications: {e}")
            return []
    
    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark notification as read"""
        if not self.storage:
            return False
        
        try:
            return await self.storage.mark_notification_read(notification_id, user_id)
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: int) -> bool:
        """Mark all notifications as read"""
        if not self.storage:
            return False
        
        try:
            return await self.storage.mark_all_notifications_read(user_id)
        except Exception as e:
            logger.error(f"Failed to mark all as read: {e}")
            return False
    
    async def save_push_token(self, user_id: int, expo_push_token: str) -> bool:
        """Save user's Expo push token for notifications"""
        if not self.storage:
            return False
        
        try:
            return await self.storage.save_push_token(user_id, expo_push_token)
        except Exception as e:
            logger.error(f"Failed to save push token: {e}")
            return False
    
    async def update_notification_preferences(
        self,
        user_id: int,
        preferences: Dict
    ) -> bool:
        """Update user notification preferences"""
        if not self.storage:
            return False
        
        try:
            return await self.storage.update_notification_preferences(user_id, preferences)
        except Exception as e:
            logger.error(f"Failed to update preferences: {e}")
            return False
    
    async def broadcast_news_to_all_users(self, news_item: Dict) -> Dict:
        """Broadcast important news to all users with notifications enabled"""
        if not self.storage:
            return {"success": False, "error": "Storage not available"}
        
        try:
            # Get all users with push notifications enabled
            users = await self.storage.get_users_with_push_enabled()
            
            sent_count = 0
            failed_count = 0
            
            for user in users:
                try:
                    await self.send_news_notification(
                        user_id=user["id"],
                        news_item=news_item,
                        send_push=True
                    )
                    sent_count += 1
                except Exception:
                    failed_count += 1
                
                # Rate limiting
                await asyncio.sleep(0.1)
            
            return {
                "success": True,
                "sent": sent_count,
                "failed": failed_count
            }
            
        except Exception as e:
            logger.error(f"Broadcast failed: {e}")
            return {"success": False, "error": str(e)}

# Global instance
notification_service = NotificationService()

def initialize_notification_service(storage):
    """Initialize notification service with storage"""
    notification_service.storage = storage
    logger.info("✅ Notification service initialized")
