import threading
import time
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from alert_models import Alert
from stock_models import Stock
from market_api import fetch_stock_data
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertManager:
    def __init__(self):
        self.check_interval = 60  # Check every 60 seconds
        self.running = False
        self.thread = None
        
    def start_alert_monitoring(self):
        """Start the background thread for monitoring alerts"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_alerts, daemon=True)
            self.thread.start()
            logger.info("Alert monitoring started")
    
    def stop_alert_monitoring(self):
        """Stop the background thread for monitoring alerts"""
        self.running = False
        if self.thread:
            self.thread.join()
        logger.info("Alert monitoring stopped")
    
    def _monitor_alerts(self):
        """Background thread function to check alerts periodically"""
        while self.running:
            try:
                # This would typically get a database session
                # For now, we'll simulate the functionality
                self._check_all_alerts()
            except Exception as e:
                logger.error(f"Error in alert monitoring: {str(e)}")
            
            # Wait for the specified interval before checking again
            time.sleep(self.check_interval)
    
    def _check_all_alerts(self):
        """Check all active alerts against current stock prices"""
        try:
            # Create a new database session for this background task
            from database import SessionLocal
            db = SessionLocal()
            
            try:
                # Get all active alerts from the database
                active_alerts = db.query(Alert).filter(Alert.is_active == True).all()
                
                logger.info(f"Checking {len(active_alerts)} active alerts...")
                
                # Check each alert
                for alert in active_alerts:
                    try:
                        self.check_single_alert(db, alert)
                    except Exception as e:
                        logger.error(f"Error checking alert {alert.id}: {str(e)}")
                        
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error in _check_all_alerts: {str(e)}")
    
    def create_alert(self, db: Session, user_id: int, stock_symbol: str, alert_type: str, target_value: float):
        """Create a new price alert"""
        try:
            new_alert = Alert(
                user_id=user_id,
                stock_symbol=stock_symbol.upper(),
                alert_type=alert_type.lower(),
                target_value=target_value
            )
            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)
            logger.info(f"Created alert for user {user_id}: {stock_symbol} {alert_type} {target_value}")
            return new_alert
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating alert: {str(e)}")
            raise e
    
    def get_user_alerts(self, db: Session, user_id: int) -> List[Alert]:
        """Get all alerts for a specific user"""
        try:
            alerts = db.query(Alert).filter(Alert.user_id == user_id).all()
            return alerts
        except Exception as e:
            logger.error(f"Error getting user alerts: {str(e)}")
            raise e
    
    def delete_alert(self, db: Session, alert_id: int, user_id: int):
        """Delete a specific alert"""
        try:
            alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
            if alert:
                db.delete(alert)
                db.commit()
                logger.info(f"Deleted alert {alert_id} for user {user_id}")
                return True
            return False
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting alert: {str(e)}")
            raise e
    
    def check_single_alert(self, db: Session, alert: Alert):
        """Check if a single alert condition is met"""
        try:
            # Fetch current stock data
            stock_data = fetch_stock_data(alert.stock_symbol)
            
            if not stock_data:
                logger.warning(f"Could not fetch data for {alert.stock_symbol}")
                return False
            
            current_price = stock_data['price']
            
            # Check alert conditions based on alert type
            alert_triggered = False
            
            if alert.alert_type == 'above' and current_price > alert.target_value:
                alert_triggered = True
            elif alert.alert_type == 'below' and current_price < alert.target_value:
                alert_triggered = True
            elif alert.alert_type == 'percent_change':
                # Calculate percentage change from previous close
                previous_close = stock_data.get('previous_close')
                if previous_close and previous_close != 0:
                    percent_change = ((current_price - previous_close) / previous_close) * 100
                    
                    # For percent change, target_value represents the threshold percentage
                    if percent_change >= alert.target_value:
                        alert_triggered = True
                    
            if alert_triggered:
                self._trigger_alert(db, alert, current_price)
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error checking alert {alert.id}: {str(e)}")
            return False
    
    def _trigger_alert(self, db: Session, alert: Alert, current_price: float):
        """Trigger an alert and update its record"""
        try:
            # Update alert record
            alert.last_triggered = datetime.utcnow()
            alert.triggered_count += 1
            db.commit()
            
            logger.info(f"ALERT TRIGGERED: {alert.stock_symbol} {alert.alert_type} {alert.target_value} "
                       f"(current price: {current_price}) for user {alert.user_id}")
            
            # In a real implementation, you would send notifications here
            # This could be:
            # - Push notification to the user's device
            # - Email notification
            # - WebSocket message to the user's connected frontend
            # - Add to a notifications table in the database
        except Exception as e:
            db.rollback()
            logger.error(f"Error triggering alert {alert.id}: {str(e)}")

# Global alert manager instance
alert_manager = AlertManager()