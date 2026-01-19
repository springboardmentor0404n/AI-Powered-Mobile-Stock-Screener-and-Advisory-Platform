import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from retriever import query_stock_assistant  # Ensure retriever.py exists!
from fastapi import FastAPI, HTTPException ,Depends
from pydantic import BaseModel, EmailStr
import asyncpg
from contextlib import asynccontextmanager
from passlib.context import CryptContext
import uvicorn
import jwt
from typing import Optional,List
import datetime
import random
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import decimal
from datetime import datetime, timedelta
from fastapi import FastAPI, BackgroundTasks, Depends
from sqlalchemy.orm import Session
import firebase_admin
from firebase_admin import messaging, credentials
from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import declarative_base, Session
# Import everything needed from main3
from main3 import (
    get_db, 
    get_stock_candles, 
    update_fcm_token_logic, 
    create_price_alert_logic, 
    add_new_stock_logic,
    TokenUpdate, 
    AlertRequest, 
    StockCreate,
    send_fcm_notification
)# This "borrows" the function from main3
# app = FastAPI()

# ---------- LOAD .ENV ----------
load_dotenv()

# --- Configuration Variables ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") # Web Client ID for token verification

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
google_request = requests.Request()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
    
# ---------- LIFESPAN ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Connecting to database...")
    try:
        app.state.db = await asyncpg.connect(DATABASE_URL)
        print("Database connected!")
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        # Optionally exit or degrade gracefully
    
    if not GOOGLE_CLIENT_ID:
        print("WARNING: GOOGLE_CLIENT_ID not set. Google Auth will fail.")

    yield
    print("Closing database...")
    if hasattr(app.state, 'db'):
        await app.state.db.close()
        print("Database closed.")

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

app = FastAPI(lifespan=lifespan)

# Enable CORS so Flutter can talk to this API

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],  # Allows all origins

    allow_methods=["*"],

    allow_headers=["*"],

)



class QueryRequest(BaseModel):

    question: str


# ---------- Pydantic Models ----------
class RegisterModel(BaseModel):
    email: EmailStr
    password: str

class LoginModel(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyModel(BaseModel):
    email: EmailStr
    otp: str

class GoogleAuthModel(BaseModel):
    id_token: str

class HistorySaveModel(BaseModel):
    email: EmailStr
    query: str
    response: str

# --- SCHEMAS ---
class WatchlistRequest(BaseModel):
    user_id: int
    symbol: str

class HoldingCreate(BaseModel):
    symbol: str
    quantity: int
    avg_buy_price: float

class PortfolioItem(BaseModel):
    symbol: str
    company_name: str
    quantity: int
    buy_price: float
    current_price: float
    pnl: float
    pnl_percentage: float

class BuyRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    price: float
# ---------- HELPER FUNCTIONS ----------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Handle case where hashed_pass might be None (for Google-only users)
    if hashed_password is None:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(data: dict, expires_minutes: Optional[int] = 15) -> str:
    token_data = data.copy()
    
    # FIX: Remove the 'datetime.' and 'datetime.' prefixes
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    
    token_data.update({"exp": expire})
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_otp_email(to_email: str, otp: str):
    msg = MIMEText(f"Your OTP is: {otp}\nThis OTP is valid for 5 minutes.")
    msg["Subject"] = "Your Login OTP"
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
        # In a production app, you might log this error but still proceed.
        pass

def send_push_to_user(token: str, title: str, body: str):
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
        android=messaging.AndroidConfig(
            priority='high', # This makes it pop up like WhatsApp
            notification=messaging.AndroidNotification(
                channel_id='high_importance_channel', # MUST match Flutter channel ID
                priority='high',
            ),
        ),
    )
    messaging.send(message)

class ProductUpdate(BaseModel):
    stock: int
    price: float

class NotificationRequest(BaseModel):
    email: str
    title: str
    body: str
# ==============================================================================
# 🚀 LOCAL AUTHENTICATION (REGISTER & OTP LOGIN)
# ==============================================================================

# ---------- 1. REGISTER (Local Email/Password) ----------
@app.post("/register")
async def register(data: RegisterModel):
    hashed_pass = pwd_context.hash(data.password)
    try:
        await app.state.db.execute(
            """
            INSERT INTO users (email_id, hashed_pass)
            VALUES ($1, $2)
            """,
            data.email,
            hashed_pass
        )
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Email already exists")
    return {"message": "User registered successfully! Proceed to login."}

# ---------- 2. LOGIN STEP 1 (REQUEST OTP) ----------
@app.post("/login/request-otp")
async def request_otp(data: LoginModel):
    user_row = await app.state.db.fetchrow(
        "SELECT * FROM users WHERE email_id = $1",
        data.email
    )

    # Check existence and local password
    if user_row is None or not verify_password(data.password, user_row.get("hashed_pass")):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    # Save/Update OTP in the database
    await app.state.db.execute(
        """
        INSERT INTO otp_codes (email_id, otp, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (email_id)
        DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at
        """,
        data.email, otp, expires_at
    )

    send_otp_email(data.email, otp)
    return {"message": "OTP sent to your email"}

# ---------- 3. LOGIN STEP 2 (VERIFY OTP) ----------
@app.post("/login/verify-otp")
async def verify_otp(data: OTPVerifyModel):
    row = await app.state.db.fetchrow(
        "SELECT * FROM otp_codes WHERE email_id = $1",
        data.email
    )

    if row is None:
        raise HTTPException(status_code=400, detail="OTP not requested or user not found")

    if row["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if row["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    token = create_jwt_token({"sub": data.email}, expires_minutes=30) # 30 min expiry for local login

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/ask")

async def ask_stock_bot(request: QueryRequest):

    print(f"Received question: {request.question}")

    answer = query_stock_assistant(request.question)

    return {"answer": answer}


@app.post("/history/save")
async def save_history(data: HistorySaveModel):
    await app.state.db.execute(
        "INSERT INTO chat_history (email_id, query, response) VALUES ($1, $2, $3)",
        data.email, data.query, data.response
    )
    return {"status": "saved"}

@app.get("/history/{email}")
async def get_history(email: str):
    rows = await app.state.db.fetch(
        "SELECT query, response, created_at FROM chat_history WHERE email_id = $1 ORDER BY created_at DESC",
        email
    )
    return [dict(row) for row in rows]



# 1. KPI Endpoint: Global Market Stats
@app.get("/dashboard/kpis")
def get_market_kpis(db: Session = Depends(get_db)):
    query = text("""
        SELECT AVG(current_pe_ratio) as pe, SUM(market_cap) as cap, COUNT(DISTINCT symbol) as count 
        FROM stock_screener_dataset WHERE date = (SELECT MAX(date) FROM stock_screener_dataset)
    """)
    res = db.execute(query).fetchone()
    return {"avg_pe": f"{res.pe:.2f}", "total_mcap": f"${res.cap/1e12:.2f}T", "stocks": res.count}

# 2. Filterable History: High/Low/Close for the Line Graph
@app.get("/stocks/history/{symbol}")
def get_stock_trend(symbol: str, db: Session = Depends(get_db)):
    # Returns all three metrics so Flutter can toggle locally
    query = text("SELECT date, high, low, close_price FROM stock_screener_dataset WHERE symbol = :s ORDER BY date ASC")
    res = db.execute(query, {"s": symbol}).fetchall()
    return [{"d": str(r.date), "h": r.high, "l": r.low, "c": r.close_price} for r in res]

# 3. Bar Chart Endpoint: Top 5 by Market Cap
@app.get("/stocks/top-leaders")
def get_top_leaders(db: Session = Depends(get_db)):
    query = text("SELECT symbol, market_cap FROM stock_screener_dataset WHERE date = (SELECT MAX(date) FROM stock_screener_dataset) ORDER BY market_cap DESC LIMIT 5")
    return [dict(r._mapping) for r in db.execute(query).fetchall()]

# 4. Table Endpoint: Top 5 Detailed
@app.get("/stocks/top-table")
def get_table_data(db: Session = Depends(get_db)):
    # 1. Define the SQL query with a named parameter for safety
    # We hardcode 'current_pe_ratio' to ensure this specific endpoint 
    # always fulfills its "Top P/E" purpose.
    query = text("""
        SELECT company_name, current_pe_ratio, volume, revenue_yoy, symbol 
        FROM stock_screener_dataset 
        WHERE date = (SELECT MAX(date) FROM stock_screener_dataset) 
        ORDER BY current_pe_ratio DESC 
        LIMIT 5
    """)
    
    try:
        result = db.execute(query)
        # 2. Use .mappings() for cleaner dictionary conversion in SQLAlchemy 1.4+
        return [dict(r) for r in result.mappings()]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database query failed")

@app.get("/stocks/nifty15")
def get_nifty_15(db: Session = Depends(get_db)):
    query = text("SELECT DISTINCT symbol, company_name FROM stock_screener_dataset LIMIT 50")
    return [dict(r._mapping) for r in db.execute(query).fetchall()]

# 2. Bar Chart Data: Top 5 Market Cap
@app.get("/stocks/market-cap-leaders")
def get_mcap_leaders(db: Session = Depends(get_db)):
    query = text("""
        SELECT symbol, market_cap FROM stock_screener_dataset 
        WHERE date = (SELECT MAX(date) FROM stock_screener_dataset)
        ORDER BY market_cap DESC LIMIT 5
    """)
    return [dict(r._mapping) for r in db.execute(query).fetchall()]

@app.get("/dashboard/volume-share")
def get_volume_share(db: Session = Depends(get_db)):
    # Group by sector and sum the volume
    query = text("""
        SELECT sector, SUM(volume) as total_volume
        FROM stock_screener_dataset 
        WHERE date = (SELECT MAX(date) FROM stock_screener_dataset)
        GROUP BY sector
        ORDER BY total_volume DESC
    """)
    results = db.execute(query).fetchall()
    
    # Calculate the grand total to provide percentages
    grand_total = sum(r.total_volume for r in results)
    
    return [
        {
            "sector": r.sector,
            "volume": float(r.total_volume),
            "percentage": round((r.total_volume / grand_total) * 100, 2)
        } for r in results
    ]



@app.get("/portfolio/sector-allocation")
def get_sector_allocation(db: Session = Depends(get_db)):
    # 1. Join holdings with master data to get current market values per sector
    query = text("""
        SELECT 
            s.sector, 
            SUM(p.quantity * s.close_price) AS sector_value
        FROM user_portfolio p
        JOIN stock_screener_dataset s ON p.symbol = s.symbol
        WHERE s.date = (SELECT MAX(date) FROM stock_screener_dataset)
        GROUP BY s.sector
        ORDER BY sector_value DESC
    """)
    results = db.execute(query).fetchall()
    
    # 2. Calculate the Total Portfolio Value to derive percentages
    total_wealth = sum(r.sector_value for r in results) if results else 1
    
    # 3. Format the data for the Flutter Donut Chart
    return [
        {
            "sector": r.sector,
            "value": float(r.sector_value),
            "percentage": round((r.sector_value / total_wealth) * 100, 1)
        } for r in results
    ]

@app.get("/stocks/search")
def search_stocks(query: str, db: Session = Depends(get_db)):
    # Search by symbol or company name (case-insensitive)
    sql = text("""
        SELECT symbol, company_name, close_price 
        FROM stock_screener_dataset 
        WHERE (symbol ILIKE :q OR company_name ILIKE :q)
        AND date = (SELECT MAX(date) FROM stock_screener_dataset)
        LIMIT 10
    """)
    results = db.execute(sql, {"q": f"%{query}%"}).fetchall()
    return [dict(r._mapping) for r in results]

@app.get("/api/stocks/search")
def search_stocks(query: str, db: Session = Depends(get_db)):
    """
    Search stocks by Symbol or Name. 
    Returns latest price, change%, and a 10-point sparkline for the UI.
    """
    sql = text("""
        WITH matching_stocks AS (
            SELECT DISTINCT ON (symbol) 
                symbol, company_name, close_price as price, change_percent
            FROM stock_screener_dataset
            WHERE symbol ILIKE :q OR company_name ILIKE :q
            ORDER BY symbol, date DESC
            LIMIT 10
        )
        SELECT m.*, 
        (SELECT json_agg(c) FROM (
            SELECT close as c FROM stock_screener_dataset 
            WHERE symbol = m.symbol 
            ORDER BY date DESC LIMIT 10
        ) t) as sparkline_data
        FROM matching_stocks m
    """)
    result = db.execute(sql, {"q": f"%{query}%"}).mappings().all()
    return list(result)

# --- 2. GET USER WATCHLIST ---
@app.get("/watchlist/{email}")
def get_user_watchlist(email: str, db: Session = Depends(get_db)):
    # FIX: Use MOD() instead of % for s.close_price
    # FIX: Cast s.close_price to ::numeric so MOD() can process it
    sql = text("""
        SELECT 
            w.symbol, 
            s.company_name, 
            s.close_price as price,
            CASE 
                WHEN LENGTH(w.symbol) % 2 = 0 THEN 1.25 + MOD(s.close_price::numeric, 1)
                ELSE -0.85 - MOD(s.close_price::numeric, 0.5)
            END as change_percent,
            s.revenue_yoy
        FROM user_watchlists w
        JOIN (
            SELECT DISTINCT ON (symbol) * FROM stock_screener_dataset
            ORDER BY symbol, date DESC
        ) s ON w.symbol = s.symbol
        WHERE w.user_email = :email
    """)
    try:
        result = db.execute(sql, {"email": email}).mappings().all()
        
        # FIX: Convert Decimal objects to float so FastAPI can serialize to JSON
        cleaned_results = []
        for row in result:
            row_dict = dict(row)
            for key, value in row_dict.items():
                if isinstance(value, decimal.Decimal):
                    row_dict[key] = float(value)
            cleaned_results.append(row_dict)
            
        return cleaned_results
        
    except Exception as e:
        # This will now catch and print any remaining DB errors to your console
        print(f"Watchlist API Error: {e}")
        return []

@app.get("/stocks/graph/{symbol}")
def get_stock_graph(symbol: str, db: Session = Depends(get_db)):
    # Fetch the last 7 closing prices to make the graph UNIQUE
    query = text("""
        SELECT close_price FROM stock_screener_dataset
        WHERE symbol = :symbol 
        ORDER BY date DESC LIMIT 7
    """)
    result = db.execute(query, {"symbol": symbol}).all()
    # Return as a simple list of numbers: [2400.0, 2410.5, ...]
    return [float(row[0]) for row in reversed(result)]

@app.get("/user/portfolio/{user_id}")
def get_portfolio(user_id: str, db: Session = Depends(get_db)):
    query = text("""
        SELECT 
            p.symbol, 
            s.company_name,
            p.quantity,
            p.avg_price as buy_price,
            s.close_price as current_price,
            (s.close_price * p.quantity) as current_value,
            ((s.close_price - p.avg_price) * p.quantity) as total_pnl
        FROM user_portfolio p
        JOIN (
            SELECT DISTINCT ON (symbol) symbol, company_name, close_price 
            FROM stock_screener_dataset 
            ORDER BY symbol, date DESC
        ) s ON p.symbol = s.symbol
        WHERE p.user_id = :user_id
    """)
    
    try:
        results = db.execute(query, {"user_id": user_id}).mappings().all()
        holdings = []
        
        total_invested = 0.0
        current_market_value = 0.0
        
        for r in results:
            # Convert decimal.Decimal to float for safe calculation and JSON serialization
            h = dict(r)
            h['buy_price'] = float(h['buy_price'])
            h['current_price'] = float(h['current_price'])
            h['current_value'] = float(h['current_value'])
            h['total_pnl'] = float(h['total_pnl'])
            
            total_invested += (h['buy_price'] * h['quantity'])
            current_market_value += h['current_value']
            holdings.append(h)
            
        total_returns = current_market_value - total_invested
        returns_pct = (total_returns / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "total_invested": round(total_invested, 2),
            "current_value": round(current_market_value, 2),
            "total_returns": round(total_returns, 2),
            "returns_percentage": round(returns_pct, 2),
            "holdings": holdings
        }
    except Exception as e:
        print(f"Portfolio Error: {e}")
        return {"error": "Failed to fetch portfolio", "details": str(e), "holdings": []}

@app.get("/stocks/details/{symbol}")
def get_stock_details(symbol: str, period: str = "1M", db: Session = Depends(get_db)):
    try:
        # Define the date range (e.g., last 30 days for 1M)
        days_map = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095}
        start_date = datetime.now() - timedelta(days=days_map.get(period, 30))

        # 1. Fetch Latest Stats (Including Market Cap and PE)
        stats_query = text("""
        SELECT 
        market_cap, 
        current_pe_ratio, 
        symbol, 
        company_name, 
        close_price 
        FROM stock_screener_dataset 
        WHERE symbol = :s 
        ORDER BY date DESC 
        LIMIT 1
        """)
        
        # 2. Fetch Graph Data
        history_query = text("""
            SELECT date, close_price 
            FROM stock_screener_dataset 
            WHERE symbol = :s AND date >= :start 
            ORDER BY date ASC
        """)
        
        stats_result = db.execute(stats_query, {"s": symbol}).mappings().first()
        history_results = db.execute(history_query, {"s": symbol, "start": start_date}).mappings().all()

        if not stats_result:
            raise HTTPException(status_code=404, detail="Stock not found")

        # Convert Decimal values (like Market Cap) to floats for JSON compatibility
        stats = dict(stats_result)
        for key, value in stats.items():
            if isinstance(value, decimal.Decimal):
                stats[key] = float(value)

        return {
            "stats": stats,
            "graph_data": [
                {"date": str(r['date']), "price": float(r['close_price'])} 
                for r in history_results
            ]
        }
    except Exception as e:
        print(f"Detail Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/user/portfolio/buy")
def execute_buy(req: BuyRequest, db: Session = Depends(get_db)):
    try:
        # Check if user already owns this stock to update average price
        check_query = text("SELECT quantity, avg_price FROM user_portfolio WHERE user_id = :u AND symbol = :s")
        existing = db.execute(check_query, {"u": req.user_id, "s": req.symbol}).fetchone()

        if existing:
            # Weighted average price calculation
            total_qty = existing.quantity + req.quantity
            new_avg = ((float(existing.avg_price) * existing.quantity) + (req.price * req.quantity)) / total_qty
            
            update_query = text("""
                UPDATE user_portfolio 
                SET quantity = :q, avg_price = :p 
                WHERE user_id = :u AND symbol = :s
            """)
            db.execute(update_query, {"q": total_qty, "p": new_avg, "u": req.user_id, "s": req.symbol})
        else:
            insert_query = text("""
                INSERT INTO user_portfolio (user_id, symbol, quantity, avg_price) 
                VALUES (:u, :s, :q, :p)
            """)
            db.execute(insert_query, {"u": req.user_id, "s": req.symbol, "q": req.quantity, "p": req.price})
        
        db.commit()
        return {"status": "success", "message": f"Bought {req.quantity} shares of {req.symbol}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/watchlist/add")
def add_to_watchlist(email: str, symbol: str, db: Session = Depends(get_db)):
    try:
        # Check if already exists using bind parameters safely
        exists_query = text("SELECT 1 FROM user_watchlists WHERE user_email = :e AND symbol = :s")
        check = db.execute(exists_query, {"e": email, "s": symbol}).fetchone()
        
        if not check:
            insert_query = text("INSERT INTO user_watchlists (user_email, symbol) VALUES (:e, :s)")
            db.execute(insert_query, {"e": email, "s": symbol})
            db.commit()
            return {"status": "success", "message": f"{symbol} added to watchlist."}
        
        return {"status": "already_exists", "message": "Symbol already in watchlist."}

    except Exception as e:
        db.rollback()
        # Log the error for debugging
        print(f"Error: {e}") 
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
# --- 4. REMOVE FROM WATCHLIST ---
@app.delete("/watchlist/remove")
def remove_from_watchlist(email: str, symbol: str, db: Session = Depends(get_db)):
    try:
        sql = text("""
            DELETE FROM user_watchlists 
            WHERE user_email = :email AND symbol = :symbol
        """)
        result = db.execute(sql, {"email": email, "symbol": symbol})
        db.commit()
        
        if result.rowcount > 0:
            return {"status": "success", "message": f"{symbol} removed"}
        else:
            return {"status": "error", "message": "Stock not found in watchlist"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    
# --- 5. STOCK HISTORY (For Detailed Charts) ---
@app.get("/stocks/history/{symbol}")
def get_stock_history(symbol: str, db: Session = Depends(get_db)):
    """
    Returns the full historical data for a specific stock for the main graph.
    """
    sql = text("""
        SELECT date, high as h, low as l, close as c, volume as v
        FROM stock_screener_dataset
        WHERE symbol = :s
        ORDER BY date ASC
    """)
    result = db.execute(sql, {"s": symbol.upper()}).mappings().all()
    return list(result)

@app.get("/stocks/candles/{symbol}")
def candles_endpoint(symbol: str):
    return get_stock_candles(symbol)

# 2. Update FCM Token
@app.post("/user/update-fcm-token")
def update_token(data: TokenUpdate, db: Session = Depends(get_db)):
    return update_fcm_token_logic(data, db)

@app.post("/alerts/create")
def create_alert(alert: AlertRequest, db: Session = Depends(get_db)):
    return create_price_alert_logic(alert, db)

@app.post("/stocks/add")
def add_stock(stock_data: StockCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return add_new_stock_logic(stock_data, background_tasks, db)

# Changed @router to @app
@app.post("/update-fcm-token-manual")
async def update_token_manual(token: str, email: str, db: Session = Depends(get_db)):
    # Using raw SQL to be consistent with your other endpoints
    query = text("UPDATE users SET fcm_token = :t WHERE email_id = :e")
    db.execute(query, {"t": token, "e": email})
    db.commit()
    return {"status": "success"}

# Changed @router to @app and added the payload model
@app.put("/products/{id}")
def update_product_stock(id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    # Use your stock_screener_dataset table or products table
    query = text("SELECT close_price, stock_quantity FROM stock_screener_dataset WHERE id = :id")
    product = db.execute(query, {"id": id}).fetchone()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_price = float(product.close_price)
    
    # Update the database
    update_query = text("""
        UPDATE stock_screener_dataset 
        SET close_price = :p, stock_quantity = :s 
        WHERE id = :id
    """)
    db.execute(update_query, {"p": payload.price, "s": payload.stock, "id": id})
    db.commit()

    # Logic for notification trigger
    if payload.price < (old_price * 0.9): # 10% drop
        # You can call your send_push_to_user here
        print("Price drop detected! Sending notification...")
        
    return {"status": "updated"}

from datetime import datetime

@app.post("/send-notification")
async def trigger_manual_notification(req: NotificationRequest, db: Session = Depends(get_db)):
    # 1. Fetch user token
    user = db.execute(text("SELECT fcm_token FROM users WHERE email_id = :e"), {"e": req.email}).fetchone()
    
    # 2. Trigger the IN-APP UI POPUP
    send_fcm_notification(user.fcm_token, req.title, req.body)

    # 3. SAVE TO DATABASE (This makes it appear in the 'Notification Section')
    db.execute(
        text("INSERT INTO notifications (user_email, title, body, created_at) VALUES (:e, :t, :b, NOW())"),
        {"e": req.email, "t": req.title, "b": req.body}
    )
    db.commit() # <--- CRITICAL for storage
    return {"status": "success"}
    
     

class TokenUpdate(BaseModel):
    email: str  # Flutter sends "email"
    token: str 

@app.post("/user/update-fcm-token")
async def update_fcm_token(data: TokenUpdate, db: Session = Depends(get_db)):
    try:
        # We use 'email_id' because that's what your users table uses
        # We use 'fcm_token' because that's the column in your users table
        query = text("""
            UPDATE users 
            SET fcm_token = :t 
            WHERE email_id = :e
        """)
        result = db.execute(query, {"t": data.token, "e": data.email})
        db.commit()

        if result.rowcount == 0:
            print(f"⚠️ User {data.email} not found during token sync")
            raise HTTPException(status_code=404, detail="User not found")

        print(f"✅ Token synced for: {data.email}")
        return {"status": "success", "message": "Token linked to user"}
    except Exception as e:
        db.rollback()
        print(f"❌ Error syncing token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

Base = declarative_base()

class PriceAlert(BaseModel):
    user_email: str
    symbol: str
    target_price: float
    condition: str

class UserAlert(Base):
    __tablename__ = "user_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255))
    symbol = Column(String(50))
    target_price = Column(Float)
    condition = Column(String(10)) # "ABOVE" or "BELOW"
    is_active = Column(Boolean, default=True)

@app.post("/set-alert")
def create_alert(alert_data: PriceAlert, db: Session = Depends(get_db)):
    new_alert = UserAlert(
        user_email=alert_data.user_email,
        symbol=alert_data.symbol,
        target_price=alert_data.target_price,
        condition=alert_data.condition,
        is_active=True
    )
    db.add(new_alert)
    db.commit()
    return {"status": "success", "message": "Alert synchronized"}

def get_user_token(email: str, db: Session = None) -> str:
    """Retrieve the FCM token for a user by email."""
    if db is None:
        db = SessionLocal()
    try:
        user = db.execute(text("SELECT fcm_token FROM users WHERE email_id = :e"), {"e": email}).fetchone()
        return user.fcm_token if user else None
    finally:
        if db:
            db.close()

def process_dynamic_alerts(db: Session, symbol: str, current_price: float):
    # 1. Find all active alerts for this specific stock
    alerts = db.query(UserAlert).filter(
        UserAlert.symbol == symbol, 
        UserAlert.is_active == True
    ).all()

    for alert in alerts:
        triggered = False
        
        # 2. Logic for Dynamic Conditions
        if alert.condition == "ABOVE" and current_price >= alert.target_price:
            triggered = True
        elif alert.condition == "BELOW" and current_price <= alert.target_price:
            triggered = True

        if triggered:
            # 3. Trigger the Notification & Haptics
            user_token = get_user_token(alert.user_email, db)
            if user_token:
                send_fcm_notification(
                    token=user_token,
                    title=f"🎯 Target Hit: {symbol}",
                    body=f"{symbol} has reached your price of ₹{current_price}"
                )
            
            # 4. Mark as inactive so it doesn't repeat
            alert.is_active = False
            db.commit()



# ---------- ROOT & RUN ----------
@app.get("/")
def root():
    return {"message": "Auth Server Running"}

if __name__ == "__main__":
    uvicorn.run("main2:app", host="0.0.0.0", port=8001, reload=True)