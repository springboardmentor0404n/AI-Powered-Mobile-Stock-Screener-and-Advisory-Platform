from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, validator
import bcrypt
import jwt
from datetime import datetime, timedelta
from database import engine, get_db
from models import User
from stock_models import Stock
from crud import get_user_by_email, create_user, verify_password
from sqlalchemy.orm import Session
import os
from rag import ask_question as rag_ask_question
import re

# ---------------- CONFIG ----------------
SECRET_KEY = "046862e6d93a04ad9c00d4c02bf0e46e7234d6ed41eca4e4ce4a039a1d590f3f"  # paste the one you generated
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

app = FastAPI()

# ---------------- STATIC FILES ----------------
# Mount static files
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")

# Serve HTML files
@app.get("/")
async def read_index():
    return FileResponse('../frontend/login.html')

@app.get("/home")
async def read_home():
    return FileResponse('../frontend/dashboard.html')

@app.get("/login.html")
async def read_login():
    return FileResponse('../frontend/login.html')

@app.get("/register.html")
async def read_register():
    return FileResponse('../frontend/register.html')

@app.get("/chat.html")
async def read_chat():
    return FileResponse('../frontend/chat.html')

@app.get("/dashboard.html")
async def read_dashboard():
    return FileResponse('../frontend/dashboard.html')

@app.get("/advanced_dashboard.html")
async def read_advanced_dashboard():
    return FileResponse('../frontend/dashboard.html')

@app.get("/upstock_dashboard.html")
async def read_upstock_dashboard():
    return FileResponse('../frontend/dashboard.html')

@app.get("/full_dashboard")
async def read_full_dashboard():
    return FileResponse('../frontend/dashboard.html')

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend is separate
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DATABASE INITIALIZATION ----------------
# Create tables
from models import Base
from stock_models import Stock  # Import Stock model
from alert_models import Alert  # Import Alert model
Base.metadata.create_all(bind=engine)

# Initialize stock database with CSV data
from load_data import init_stock_db
init_stock_db()

# Initialize and start alert monitoring
from alert_system import alert_manager
try:
    alert_manager.start_alert_monitoring()
    print("Alert monitoring system started successfully")
except Exception as e:
    print(f"Error starting alert monitoring: {e}")

# ---------------- MODELS ----------------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...)
    password: str = Field(..., min_length=6, max_length=100)
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

class LoginData(BaseModel):
    email: str
    password: str

class Question(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)

# ---------------- HELPERS ----------------
def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = get_user_by_email(db, email)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---------------- ROUTES ----------------
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    try:
        db_user = create_user(db, user.username, user.email, user.password)
        return {"msg": "User registered successfully", "user_id": db_user.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    # Validate input
    if not data.email or not data.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    # Authenticate user
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    try:
        token = create_access_token({"sub": data.email})
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating token: {str(e)}")

# Get real-time stock data
@app.get("/stocks/{symbol}")
def get_stock_data(symbol: str, db: Session = Depends(get_db)):
    try:
        stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
        
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        return {
            "symbol": stock.symbol,
            "company_name": stock.company_name,
            "industry": stock.industry,
            "current_price": stock.current_price,
            "daily_high": stock.daily_high,
            "daily_low": stock.daily_low,
            "volume": stock.volume,
            "last_updated": stock.last_updated,
            "market_cap": stock.market_cap,
            "current_value": stock.current_value
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stock data: {str(e)}")

# Get all stocks
@app.get("/stocks/")
def get_all_stocks(db: Session = Depends(get_db)):
    try:
        stocks = db.query(Stock).all()
        
        result = []
        for stock in stocks:
            result.append({
                "symbol": stock.symbol,
                "company_name": stock.company_name,
                "industry": stock.industry,
                "current_price": stock.current_price,
                "daily_high": stock.daily_high,
                "daily_low": stock.daily_low,
                "volume": stock.volume,
                "last_updated": stock.last_updated,
                "market_cap": stock.market_cap
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stocks: {str(e)}")

# Update stock prices with real-time data
@app.post("/stocks/update")
def update_stock_prices(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        from market_api import update_stock_prices
        updated_count = update_stock_prices(db)
        
        return {"message": f"Successfully updated {updated_count} stocks", "user": user.username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating stock prices: {str(e)}")

@app.post("/ask")
def ask_question(q: Question, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    # Validate question
    if not q.question or not q.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Process the question using RAG
    try:
        answer = rag_ask_question(q.question)
        return {"answer": answer, "user": user.username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


# ---------------- ALERT SYSTEM ENDPOINTS ----------------
from alert_system import alert_manager
from pydantic import BaseModel


class AlertCreateRequest(BaseModel):
    stock_symbol: str
    alert_type: str  # 'above', 'below', 'percent_change'
    target_value: float


@app.post("/alerts/create")
def create_alert(request: AlertCreateRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        alert = alert_manager.create_alert(
            db=db,
            user_id=user.id,
            stock_symbol=request.stock_symbol,
            alert_type=request.alert_type,
            target_value=request.target_value
        )
        
        return {
            "message": "Alert created successfully",
            "alert_id": alert.id,
            "user": user.username
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating alert: {str(e)}")


@app.get("/alerts/")
def get_user_alerts(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        alerts = alert_manager.get_user_alerts(db, user.id)
        
        result = []
        for alert in alerts:
            result.append({
                "id": alert.id,
                "stock_symbol": alert.stock_symbol,
                "alert_type": alert.alert_type,
                "target_value": alert.target_value,
                "is_active": alert.is_active,
                "created_at": alert.created_at,
                "last_triggered": alert.last_triggered,
                "triggered_count": alert.triggered_count
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts: {str(e)}")


@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        success = alert_manager.delete_alert(db, alert_id, user.id)
        
        if success:
            return {"message": "Alert deleted successfully", "user": user.username}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting alert: {str(e)}")


@app.put("/alerts/{alert_id}/activate")
def activate_alert(alert_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert.is_active = True
        db.commit()
        
        return {"message": "Alert activated successfully", "user": user.username}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error activating alert: {str(e)}")


@app.put("/alerts/{alert_id}/deactivate")
def deactivate_alert(alert_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert.is_active = False
        db.commit()
        
        return {"message": "Alert deactivated successfully", "user": user.username}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deactivating alert: {str(e)}")


@app.post("/alerts/start_monitoring")
def start_alert_monitoring(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    user = verify_token(token, db)
    
    try:
        alert_manager.start_alert_monitoring()
        return {"message": "Alert monitoring started", "user": user.username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting alert monitoring: {str(e)}")
