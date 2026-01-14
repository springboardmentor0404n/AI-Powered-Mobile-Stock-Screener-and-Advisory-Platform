import os
import time
import schedule
import requests
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class AlertChecker:
    def __init__(self):
        self.db_conn = self.get_db_connection()
        self.api_base_url = "http://localhost:5000"  # Change to your API URL
        
    def get_db_connection(self):
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'stock_screener'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
            port=os.getenv('DB_PORT', '5432')
        )
    
    def get_unique_symbols_with_alerts(self):
        """Get all unique symbols that have active alerts"""
        cur = self.db_conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT DISTINCT symbol FROM alerts 
            WHERE is_active = true
        """)
        symbols = [row['symbol'] for row in cur.fetchall()]
        cur.close()
        return symbols
    
    def check_symbol_alerts(self, symbol):
        """Check alerts for a specific symbol"""
        try:
            response = requests.get(
                f"{self.api_base_url}/analytics/alerts/check/{symbol}",
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"Checked {symbol}: {result['alerts_triggered']} alerts triggered")
                
                # Send notifications for triggered alerts
                for triggered in result.get('triggered_alerts', []):
                    self.send_notifications(triggered, result)
                    
                return result
            else:
                print(f"Error checking {symbol}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error checking alerts for {symbol}: {e}")
            return None
    
    def send_notifications(self, triggered_alert, stock_data):
        """Send notifications for triggered alert"""
        try:
            cur = self.db_conn.cursor(cursor_factory=RealDictCursor)
            
            # Get user preferences
            cur.execute("""
                SELECT u.email, np.* 
                FROM users u
                LEFT JOIN notification_preferences np ON u.id = np.user_id
                WHERE u.id = %s
            """, (triggered_alert['user_id'],))
            
            user_prefs = cur.fetchone()
            
            if not user_prefs:
                return
            
            # Send email notification
            if user_prefs.get('email_notifications', True):
                self.send_email_notification(user_prefs['email'], triggered_alert, stock_data)
            
            # In-app notification already created by API endpoint
            
            # For push notifications (you'd integrate with Firebase/OneSignal here)
            if user_prefs.get('push_notifications', False):
                self.send_push_notification(triggered_alert['user_id'], triggered_alert, stock_data)
            
            cur.close()
            
        except Exception as e:
            print(f"Error sending notifications: {e}")
    
    def send_email_notification(self, email, triggered_alert, stock_data):
        """Send email notification"""
        try:
            # Configure your email settings
            smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', 587))
            smtp_username = os.getenv('SMTP_USERNAME', '')
            smtp_password = os.getenv('SMTP_PASSWORD', '')
            
            if not all([smtp_server, smtp_username, smtp_password]):
                print("Email configuration missing")
                return
            
            # Create email message
            subject = f"Stock Alert Triggered: {stock_data['symbol']}"
            
            message = MIMEMultipart()
            message['From'] = smtp_username
            message['To'] = email
            message['Subject'] = subject
            
            body = f"""
            <h2>Stock Alert Triggered!</h2>
            <p><strong>Symbol:</strong> {stock_data['symbol']}</p>
            <p><strong>Current Price:</strong> ${stock_data['current_price']:.2f}</p>
            <p><strong>Condition Met:</strong> {triggered_alert['condition_met']}</p>
            <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <br>
            <p>Login to your account to see more details.</p>
            """
            
            message.attach(MIMEText(body, 'html'))
            
            # Send email
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(message)
            
            print(f"Email sent to {email}")
            
        except Exception as e:
            print(f"Error sending email: {e}")
    
    def send_push_notification(self, user_id, triggered_alert, stock_data):
        """Send push notification (implement based on your push service)"""
        # This is a placeholder - implement based on your push service
        # (Firebase Cloud Messaging, OneSignal, etc.)
        pass
    
    def run_check(self):
        """Run alert check for all symbols"""
        print(f"{datetime.now()}: Starting alert check...")
        
        symbols = self.get_unique_symbols_with_alerts()
        print(f"Checking alerts for {len(symbols)} symbols")
        
        for symbol in symbols:
            self.check_symbol_alerts(symbol)
            time.sleep(1)  # Avoid rate limiting
        
        print(f"{datetime.now()}: Alert check completed")
    
    def start_scheduler(self):
        """Start the scheduled alert checker"""
        # Check every 5 minutes during market hours
        schedule.every(5).minutes.do(self.run_check)
        
        # Also run immediately on startup
        self.run_check()
        
        print("Alert checker scheduler started")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

if __name__ == "__main__":
    checker = AlertChecker()
    checker.start_scheduler()