import time
import threading
import requests
import os
from typing import Optional, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text, Column, Integer, String
from sqlalchemy.orm import sessionmaker, Session, declarative_base
import firebase_admin
from firebase_admin import messaging, credentials
from dotenv import load_dotenv
import uvicorn

# --- CONFIGURATION ---
load_dotenv()
MARKETSTACK_KEY = "29ab7b6b908d9e6f93512ee097260726"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Admin@localhost:5432/stockdb")
FIREBASE_CRED_PATH = os.getenv("FIREBASE_CRED_PATH", "serviceAccountKey.json")

# --- INITIALIZATION ---
app = FastAPI(title="Stock Live & Alerts API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Firebase Setup
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Firebase Initialization Error: {e}")

# --- DATABASE MODELS ---
class Stock(Base):
    __tablename__ = "stocks"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)

# Create tables in DB (if they don't exist)
Base.metadata.create_all(bind=engine)

# --- PYDANTIC SCHEMAS ---
class AlertRequest(BaseModel):
    user_id: str
    symbol: str
    target_price: float
    condition: str  # 'above' or 'below'

class TokenUpdate(BaseModel):
    email: str  # Flutter sends "email"
    token: str  # Flutter sends "token"

class StockCreate(BaseModel):
    symbol: str

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- UTILITY FUNCTIONS ---
from firebase_admin import messaging

from firebase_admin import messaging

def send_fcm_notification(token, title, body):
    # Ensure title and body are strings
    message = messaging.Message(
        # We DO NOT use the notification= key here.
        # This prevents the Windows/Chrome bottom-right system popup.
        data={
            "title": str(title),
            "body": str(body),
        },
        token=token,
        # High priority is required for the listener to trigger immediately
        android=messaging.AndroidConfig(
            priority='high',
        ),
        webpush=messaging.WebpushConfig(
            headers={
                "Urgency": "high" # Crucial for Web foreground delivery
            }
        ),
    )
    try:
        response = messaging.send(message)
        print(f"Successfully sent message: {response}")
        return response
    except Exception as e:
        print(f"Error sending FCM message: {e}")
        return None

def start_auto_monitor():
    def monitor_loop():
        # Store the last seen prices to detect "Changes"
        last_prices = {}
        print("🕵️‍♂️ Watcher: I'm awake and watching your DB...")

        while True:
            db = SessionLocal()
            try:
                # 1. Fetch latest prices
                query = text("""
                    SELECT symbol, close_price FROM stock_screener_dataset 
                    WHERE date = (SELECT MAX(date) FROM stock_screener_dataset)
                """)
                stocks = db.execute(query).fetchall()

                for symbol, current_price in stocks:
                    curr = float(current_price)

                    # 2. THE TRIGGER: If price changed from our memory
                    if symbol in last_prices and curr != last_prices[symbol]:
                        direction = "🚀" if curr > last_prices[symbol] else "📉"
                        print(f"{direction} Change detected in {symbol}!")

                        # 3. GET TOKENS & SEND
                        user_query = text("SELECT fcm_token, email_id FROM users WHERE fcm_token IS NOT NULL")
                        users = db.execute(user_query).fetchall()

                        for user in users:
                            send_fcm_notification(
                                user.fcm_token, 
                                f"{direction} {symbol} Alert!", 
                                f"Price just moved to ₹{curr}. Action required!"
                            )
                    
                    # Update memory
                    last_prices[symbol] = curr

            except Exception as e:
                print(f"Watcher Error: {e}")
            finally:
                db.close()
            
            time.sleep(3) # Check every 3 seconds for that "Live" feel

    # Run in background so the API stays active
    threading.Thread(target=monitor_loop, daemon=True).start()

# Start it!
start_auto_monitor()

def send_push_to_user(token: str, title: str, body: str, data: dict = None):
    if not token:
        print("❌ Skip: No token provided.")
        return

    # Convert all data values to strings (FCM requirement for the 'data' payload)
    json_data = {k: str(v) for k, v in data.items()} if data else {}

    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=json_data,
        token=token,
        # IMPORTANT: Add Android config so it shows up as a banner even in background
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='high_importance_channel', # Must match your Flutter code
                priority='high',
            ),
        ),
        # IMPORTANT: Add Web config for Flutter Web support
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                icon="https://your-app-icon.png",
            ),
        ),
    )

    try:
        response = messaging.send(message)
        print(f"✅ Successfully sent message: {response}")
        return response
    except Exception as e:
        print(f"❌ FCM Error: {e}")
        return None

def notify_new_stock_task(symbol: str, fcm_token: str):
    """Background task to send notification."""
    send_fcm_notification(
        fcm_token, 
        "Stock Added!", 
        f"{symbol} is now available in your terminal."
    )

# --- BACKGROUND MONITORING LOOP ---
def monitor_prices():
    print("Background Monitoring Started (Marketstack)...")
    while True:
        db = SessionLocal()
        try:
            query = text("SELECT id, user_id, symbol, target_price, condition FROM price_alerts WHERE is_triggered = FALSE")
            alerts = db.execute(query).mappings().all()
            
            for alert in alerts:
                symbol = alert['symbol'].upper()
                quote_url = f"http://api.marketstack.com/v1/eod/latest?access_key={MARKETSTACK_KEY}&symbols={symbol}"
                
                resp = requests.get(quote_url).json()
                
                if "data" in resp and len(resp["data"]) > 0:
                    current_price = resp["data"][0].get('close')
                    
                    if current_price:
                        triggered = False
                        if alert['condition'] == 'above' and current_price >= alert['target_price']:
                            triggered = True
                        elif alert['condition'] == 'below' and current_price <= alert['target_price']:
                            triggered = True
                        
                        if triggered:
                            token_query = text("SELECT fcm_token FROM user_devices WHERE user_id = :u")
                            token = db.execute(token_query, {"u": alert['user_id']}).scalar()
                            
                            if token:
                                send_fcm_notification(
                                    token, 
                                    f"🚨 Price Alert: {symbol}",
                                    f"{symbol} hit {alert['target_price']}! Current: {current_price}"
                                )
                            
                            update_query = text("UPDATE price_alerts SET is_triggered = TRUE WHERE id = :id")
                            db.execute(update_query, {"id": alert['id']})
                            db.commit()
                            
        except Exception as e:
            print(f"Monitoring Loop Error: {e}")
        finally:
            db.close()
        
        time.sleep(300) # Check every 5 minutes

# Start the monitoring thread
threading.Thread(target=monitor_prices, daemon=True).start()

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Live Data & Alerts API is running"}

@app.get("/stocks/candles/{symbol}")
def get_stock_candles(symbol: str):
    url = f"http://api.marketstack.com/v1/eod?access_key={MARKETSTACK_KEY}&symbols={symbol.upper()}&limit=50"
    response = requests.get(url)
    data = response.json()
    
    if "data" not in data or not data["data"]:
        return []

    return [{
        "date": item["date"],
        "open": item["open"],
        "high": item["high"],
        "low": item["low"],
        "close": item["close"],
        "volume": item["volume"],
    } for item in data["data"]]

# --- UPDATE THIS IN main3.py ---
def update_fcm_token_logic(data: TokenUpdate, db: Session):
    try:
        # 1. Use 'email' and 'token' from the 'data' object
        # 2. Update the 'users' table (consistent with your login system)
        query = text("""
            UPDATE users 
            SET fcm_token = :t 
            WHERE email_id = :e
        """)
        
        # Mapping: e -> data.email, t -> data.token
        result = db.execute(query, {"e": data.email, "t": data.token})
        db.commit()

        if result.rowcount == 0:
            return {"status": "error", "message": "User email not found in database"}

        return {"status": "success", "message": "FCM Token updated successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error in update_fcm_token_logic: {e}")
        return {"status": "error", "message": str(e)}
    
def create_price_alert_logic(alert, db):
    query = text("""
        INSERT INTO price_alerts (user_id, symbol, target_price, condition, is_triggered)
        VALUES (:u, :s, :p, :c, FALSE)
    """)
    db.execute(query, {
        "u": alert.user_id, 
        "s": alert.symbol.upper(), 
        "p": alert.target_price, 
        "c": alert.condition.lower()
    })
    db.commit()
    return {"status": "success", "message": f"Alert set for {alert.symbol}"}

def add_new_stock_logic(stock_data, background_tasks, db):
    new_stock = Stock(symbol=stock_data.symbol.upper())
    db.add(new_stock)
    db.commit()

    tokens = db.execute(text("SELECT fcm_token FROM user_devices")).fetchall()
    for row in tokens:
        if row[0]:
            background_tasks.add_task(notify_new_stock_task, stock_data.symbol, row[0])

    return {"status": "success", "message": "Stock added and notifications queued"}



    # 3. CHECK FOR NOTIFICATION TRIGGERS
    # Case A: Restock (Sudden increase from 0)
    if old_stock == 0 and product.stock_quantity > 0:
        trigger_restock_notifications(product, db)

    # Case B: Price Drop (Sudden decrease > 10%)
    if product.price < (old_price * 0.9):
        trigger_price_drop_notifications(product, db)

if __name__ == "__main__":
    # This only runs if you run 'python main3.py' directly
    
    
    import uvicorn
    uvicorn.run("main3:app", host="0.0.0.0", port=8001, reload=True)