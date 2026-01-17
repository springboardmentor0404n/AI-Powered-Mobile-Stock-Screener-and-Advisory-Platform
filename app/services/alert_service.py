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
        # UPDATED: Added /alerts to match the url_prefix in app/__init__.py
        self.api_base_url = "http://localhost:5000/alerts" 
        
    def get_db_connection(self):
        """Establish database connection"""
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'ai_screener_db'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', '12345'),
            port=os.getenv('DB_PORT', '5432')
        )
    
    def get_unique_symbols_with_alerts(self):
        """Get all unique symbols that have active alerts in PostgreSQL"""
        try:
            cur = self.db_conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT DISTINCT symbol FROM alerts 
                WHERE is_active = true
            """)
            symbols = [row['symbol'] for row in cur.fetchall()]
            cur.close()
            return symbols
        except Exception as e:
            print(f"Error fetching symbols from database: {e}")
            return []
    
    def check_symbol_alerts(self, symbol):
        """Check alerts for a specific symbol via the Flask API"""
        try:
            # UPDATED: Path adjusted to remove /analytics and use corrected base URL
            response = requests.get(
                f"{self.api_base_url}/check/{symbol}",
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"Checked {symbol}: {result.get('alerts_triggered', 0)} alerts triggered")
                
                # Process notifications for triggered alerts
                for triggered in result.get('triggered_alerts', []):
                    self.send_notifications(triggered, result)
                    
                return result
            else:
                print(f"Error checking {symbol}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Request error checking alerts for {symbol}: {e}")
            return None
    
    def send_notifications(self, triggered_alert, stock_data):
        """Send notifications for triggered alert based on user preferences"""
        try:
            cur = self.db_conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch user details and preferences from email_users
            cur.execute("""
                SELECT u.email 
                FROM email_users u
                WHERE u.id = %s
            """, (triggered_alert['user_id'],))
            
            user = cur.fetchone()
            
            if not user:
                print(f"User ID {triggered_alert['user_id']} not found.")
                return
            
            # 1. Email Logic
            self.send_email_notification(user['email'], triggered_alert, stock_data)
            
            # 2. In-app notifications are handled by the /check endpoint logic in alerts.py
            
            cur.close()
            
        except Exception as e:
            print(f"Error sending notifications: {e}")
    
    def send_email_notification(self, email, triggered_alert, stock_data):
        """Helper to send the actual email via SMTP"""
        try:
            smtp_server = os.getenv('SMTP_HOST', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', 587))
            smtp_username = os.getenv('SMTP_USER', '')
            smtp_password = os.getenv('SMTP_PASS', '')
            
            if not smtp_username or not smtp_password:
                return # Skip if email not configured
            
            subject = f"Stock Alert Triggered: {stock_data['symbol']}"
            message = MIMEMultipart()
            message['From'] = smtp_username
            message['To'] = email
            message['Subject'] = subject
            
            body = f"""
            <h2>Stock Alert Triggered!</h2>
            <p><strong>Symbol:</strong> {stock_data['symbol']}</p>
            <p><strong>Price at Trigger:</strong> ₹{stock_data['current_price']}</p>
            <p><strong>Condition Met:</strong> {triggered_alert['condition_met']}</p>
            <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            """
            
            message.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(message)
            
            print(f"Email sent successfully to {email}")
            
        except Exception as e:
            print(f"SMTP Error: {e}")

    def run_check(self):
        """Main execution logic for one check cycle"""
        print(f"[{datetime.now()}] Starting alert check cycle...")
        
        symbols = self.get_unique_symbols_with_alerts()
        print(f"Checking alerts for {len(symbols)} symbols")
        
        for symbol in symbols:
            self.check_symbol_alerts(symbol)
            time.sleep(1) # Polite delay
        
        print(f"[{datetime.now()}] Alert check cycle completed")
    
    def start_scheduler(self):
        """Start the scheduled loop"""
        # UPDATED: Changed from 5 minutes to 1 minute as requested
        schedule.every(1).minute.do(self.run_check)
        
        # Run once immediately on start
        self.run_check()
        
        print("--- Alert checker scheduler started (1-minute intervals) ---")
        
        while True:
            schedule.run_pending()
            time.sleep(1)

if __name__ == "__main__":
    checker = AlertChecker()
    checker.start_scheduler()