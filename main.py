from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
import logging
from jose import JWTError, jwt
import os
from typing import Optional, List

from database import execute, fetch_one, fetch_all
from auth_utils import hash_password, verify_password, generate_otp, create_access_token
from email_utils import send_otp
from services.stock_service import screener, get_company
from services.portfolio_service import (
    get_portfolio_holdings,
    get_portfolio_transactions,
    add_transaction,
    get_portfolio_summary,
    delete_transaction
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Stock Market Analytics Platform", version="1.0.0")
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

security = HTTPBearer(auto_error=False)

# ---------- AUTH HELPERS ----------
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return user email."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        email = payload.get("sub")
        
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Verify user exists
        user = fetch_one("SELECT * FROM users WHERE email=:e", {"e": email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return email
    except JWTError as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# ---------- AUTH ----------
class Register(BaseModel):
    username: str
    email: EmailStr
    password: str

class Login(BaseModel):
    email: EmailStr
    password: str

class OTP(BaseModel):
    email: EmailStr
    otp: str

@app.post("/register")
def register(d: Register):
    """Register a new user and send OTP for verification."""
    try:
        logger.info(f"Registration attempt for email: {d.email}")
        
        # Check if user already exists
        existing_user = fetch_one("SELECT * FROM users WHERE email=:e", {"e": d.email})
        if existing_user:
            raise HTTPException(400, "Email already registered. Please login.")
        
        otp = generate_otp()
        execute(
            "INSERT INTO pending_user VALUES (:e,:u,:p) ON CONFLICT (email) DO UPDATE SET username=:u, hashed_password=:p",
            {"e": d.email, "u": d.username, "p": hash_password(d.password)}
        )
        execute(
            "INSERT INTO otp VALUES (:e,:o,:x) ON CONFLICT (email) DO UPDATE SET otp_code=:o, expires_at=:x",
            {"e": d.email, "o": otp, "x": datetime.now()+timedelta(minutes=5)}
        )
        send_otp(d.email, otp)
        
        logger.info(f"Registration successful for {d.email}, OTP sent")
        return {"msg": "OTP sent to your email"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(500, "Registration failed. Please try again.")

@app.post("/verify-otp")
def verify(d: OTP):
    """Verify OTP and complete user registration."""
    try:
        logger.info(f"OTP verification attempt for: {d.email}")
        
        r = fetch_one("SELECT * FROM otp WHERE email=:e", {"e": d.email})
        if not r:
            raise HTTPException(400, "No OTP found for this email")
        
        if r["otp_code"] != d.otp:
            raise HTTPException(400, "Invalid OTP")
        
        # Compare expiry with current local time
        if r["expires_at"] < datetime.now():
            raise HTTPException(400, "OTP has expired. Please register again.")
        
        u = fetch_one("SELECT * FROM pending_user WHERE email=:e", {"e": d.email})
        if not u:
            raise HTTPException(400, "Registration data not found")
        
        execute("INSERT INTO users(username,email,hashed_password) VALUES (:u,:e,:p)",
                {"u": u["username"], "e": d.email, "p": u["hashed_password"]})
        
        # Clean up
        execute("DELETE FROM pending_user WHERE email=:e", {"e": d.email})
        execute("DELETE FROM otp WHERE email=:e", {"e": d.email})
        
        logger.info(f"User verified and created: {d.email}")
        return {"token": create_access_token(d.email), "msg": "Registration successful"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        raise HTTPException(500, "Verification failed. Please try again.")

class ResendOTP(BaseModel):
    email: EmailStr

@app.post("/resend-otp")
def resend_otp(d: ResendOTP):
    """Resend OTP to the user's email."""
    try:
        logger.info(f"Resend OTP request for: {d.email}")
        
        # Check if pending user exists
        pending = fetch_one("SELECT * FROM pending_user WHERE email=:e", {"e": d.email})
        if not pending:
            raise HTTPException(400, "No pending registration found. Please register again.")
        
        # Generate new OTP
        otp = generate_otp()
        execute(
            "INSERT INTO otp VALUES (:e,:o,:x) ON CONFLICT (email) DO UPDATE SET otp_code=:o, expires_at=:x",
            {"e": d.email, "o": otp, "x": datetime.now()+timedelta(minutes=5)}
        )
        send_otp(d.email, otp)
        
        logger.info(f"OTP resent to: {d.email}")
        return {"msg": "OTP sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(500, "Failed to resend OTP. Please try again.")

@app.post("/login")
def login(d: Login):
    """Authenticate user and return JWT token."""
    try:
        logger.info(f"Login attempt for: {d.email}")
        
        # Case-insensitive email matching
        u = fetch_one("SELECT * FROM users WHERE LOWER(email)=LOWER(:e)", {"e": d.email})
        
        if not u:
            logger.warning(f"User not found: {d.email}")
            raise HTTPException(401, "Invalid email or password")
        
        if not verify_password(d.password, u["hashed_password"]):
            logger.warning(f"Invalid password for: {d.email}")
            raise HTTPException(401, "Invalid email or password")
        
        logger.info(f"Login successful for: {d.email}")
        return {"token": create_access_token(d.email), "msg": "Login successful"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(500, "Login failed. Please try again.")

# ---------- FORGOT PASSWORD ----------
class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

@app.post("/forgot-password")
def forgot_password(d: ForgotPassword):
    """Send OTP for password reset."""
    try:
        logger.info(f"Forgot password request for: {d.email}")
        
        # Check if user exists (case-insensitive)
        user = fetch_one("SELECT * FROM users WHERE LOWER(email)=LOWER(:e)", {"e": d.email})
        if not user:
            # Don't reveal if email exists or not for security
            return {"msg": "If this email is registered, you will receive an OTP."}
        
        # Generate and send OTP
        otp = generate_otp()
        execute(
            "INSERT INTO otp VALUES (:e,:o,:x) ON CONFLICT (email) DO UPDATE SET otp_code=:o, expires_at=:x",
            {"e": user["email"], "o": otp, "x": datetime.now()+timedelta(minutes=10)}
        )
        send_otp(user["email"], otp)
        
        logger.info(f"Password reset OTP sent to: {d.email}")
        return {"msg": "If this email is registered, you will receive an OTP."}
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(500, "Failed to process request. Please try again.")

@app.post("/reset-password")
def reset_password(d: ResetPassword):
    """Reset password using OTP."""
    try:
        logger.info(f"Password reset attempt for: {d.email}")
        
        # Verify OTP
        otp_record = fetch_one(
            "SELECT * FROM otp WHERE LOWER(email)=LOWER(:e) AND otp_code=:o AND expires_at > :now",
            {"e": d.email, "o": d.otp, "now": datetime.now()}
        )
        
        if not otp_record:
            raise HTTPException(400, "Invalid or expired OTP")
        
        # Update password
        hashed = hash_password(d.new_password)
        execute(
            "UPDATE users SET hashed_password=:p, updated_at=:t WHERE LOWER(email)=LOWER(:e)",
            {"p": hashed, "t": datetime.now(), "e": d.email}
        )
        
        # Delete used OTP
        execute("DELETE FROM otp WHERE LOWER(email)=LOWER(:e)", {"e": d.email})
        
        logger.info(f"Password reset successful for: {d.email}")
        return {"msg": "Password reset successful. Please login with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(500, "Failed to reset password. Please try again.")

# ---------- PAGES ----------
@app.get("/")
def root(): 
    return RedirectResponse("/login")

@app.get("/login")
def login_page(r: Request): 
    return templates.TemplateResponse("login.html", {"request": r})

@app.get("/register-page")
def reg(r: Request): 
    return templates.TemplateResponse("register.html", {"request": r})

@app.get("/verify-page")
def ver(r: Request): 
    return templates.TemplateResponse("verify_otp.html", {"request": r})

@app.get("/forgot-password-page")
def forgot_page(r: Request): 
    return templates.TemplateResponse("forgot_password.html", {"request": r})

@app.get("/dashboard")
def dash(r: Request): 
    return templates.TemplateResponse("dashboard.html", {"request": r})

# ---------- API ----------
@app.get("/api/screener")
def api_screener():
    """Get all stocks data."""
    try:
        logger.info("Fetching screener data")
        data = screener()
        logger.info(f"Returning {len(data)} stocks")
        return data
    except Exception as e:
        logger.error(f"Screener error: {e}")
        raise HTTPException(500, "Failed to fetch stock data")

@app.get("/api/company/{symbol}")
def api_company(symbol: str):
    """Get detailed information about a specific company."""
    try:
        logger.info(f"Fetching company data for: {symbol}")
        d = get_company(symbol)
        if not d:
            raise HTTPException(404, f"Company '{symbol}' not found")
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company fetch error: {e}")
        raise HTTPException(500, "Failed to fetch company data")

@app.get("/api/candlestick/{symbol}")
def get_candlestick_data(symbol: str, days: int = 30):
    """Get historical OHLCV data for candlestick charts."""
    try:
        from services.stock_service import get_historical_data
        logger.info(f"Fetching candlestick data for: {symbol}, days: {days}")
        
        data = get_historical_data(symbol, days)
        if not data:
            raise HTTPException(404, f"No historical data found for '{symbol}'")
        
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Candlestick data error: {e}")
        raise HTTPException(500, "Failed to fetch candlestick data")

class Chat(BaseModel):
    message: str

@app.post("/api/chat")
async def api_chat(c: Chat, email: str = Depends(get_current_user)):
    """Chat with AI assistant about stocks (requires authentication)."""
    try:
        logger.info(f"Chat request from {email}: {c.message}")
        from services.chatbot_service import chat
        
        if not c.message.strip():
            raise HTTPException(400, "Message cannot be empty")
        
        reply = chat(c.message)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, "Failed to process chat request")

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ---------- WATCHLIST ----------
class WatchlistAdd(BaseModel):
    symbol: str

@app.get("/api/watchlist")
async def get_watchlist(email: str = Depends(get_current_user)):
    """Get user's watchlist with current stock data."""
    try:
        from database import fetch_all
        
        # Get watchlist symbols
        watchlist_items = fetch_all(
            "SELECT symbol, added_at FROM watchlist WHERE user_email=:email ORDER BY added_at DESC",
            {"email": email}
        )
        
        if not watchlist_items:
            return []
        
        # Get current stock data for watchlist symbols
        symbols = [item['symbol'] for item in watchlist_items]
        all_stocks = screener()
        
        # Filter stocks that are in watchlist
        watchlist_data = []
        for item in watchlist_items:
            stock_data = next((s for s in all_stocks if s.get('symbol') == item['symbol']), None)
            if stock_data:
                watchlist_data.append({
                    **stock_data,
                    'added_at': item['added_at'].isoformat() if item['added_at'] else None
                })
        
        logger.info(f"Watchlist fetched for {email}: {len(watchlist_data)} stocks")
        return watchlist_data
        
    except Exception as e:
        logger.error(f"Watchlist fetch error: {e}")
        raise HTTPException(500, "Failed to fetch watchlist")

@app.post("/api/watchlist")
async def add_to_watchlist(item: WatchlistAdd, email: str = Depends(get_current_user)):
    """Add a stock to user's watchlist."""
    try:
        from database import execute
        
        symbol = item.symbol.upper().strip()
        if not symbol:
            raise HTTPException(400, "Symbol is required")
        
        # Verify stock exists
        all_stocks = screener()
        if not any(s.get('symbol') == symbol for s in all_stocks):
            raise HTTPException(404, f"Stock '{symbol}' not found")
        
        # Add to watchlist (ignore if already exists due to UNIQUE constraint)
        execute(
            "INSERT INTO watchlist (user_email, symbol) VALUES (:email, :symbol) ON CONFLICT (user_email, symbol) DO NOTHING",
            {"email": email, "symbol": symbol}
        )
        
        logger.info(f"Added {symbol} to watchlist for {email}")
        return {"success": True, "message": f"{symbol} added to watchlist"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Watchlist add error: {e}")
        raise HTTPException(500, "Failed to add to watchlist")

@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, email: str = Depends(get_current_user)):
    """Remove a stock from user's watchlist."""
    try:
        from database import execute
        
        symbol = symbol.upper().strip()
        execute(
            "DELETE FROM watchlist WHERE user_email=:email AND symbol=:symbol",
            {"email": email, "symbol": symbol}
        )
        
        logger.info(f"Removed {symbol} from watchlist for {email}")
        return {"success": True, "message": f"{symbol} removed from watchlist"}
        
    except Exception as e:
        logger.error(f"Watchlist remove error: {e}")
        raise HTTPException(500, "Failed to remove from watchlist")

# ---------- PORTFOLIO ----------
class PortfolioTransaction(BaseModel):
    symbol: str
    transaction_type: str  # 'BUY' or 'SELL'
    quantity: float
    price: float
    notes: Optional[str] = None

@app.get("/api/portfolio")
async def get_portfolio(email: str = Depends(get_current_user)):
    """Get user's portfolio with current values and P&L."""
    try:
        # Get current prices from screener data
        all_stocks = screener()
        current_prices = {s['symbol']: float(s.get('close', 0)) for s in all_stocks}
        
        # Get portfolio summary with P&L calculation
        summary = get_portfolio_summary(email, current_prices)
        
        logger.info(f"Portfolio fetched for {email}: {summary['holdings_count']} holdings")
        return summary
        
    except Exception as e:
        logger.error(f"Portfolio fetch error: {e}")
        raise HTTPException(500, "Failed to fetch portfolio")

@app.get("/api/portfolio/holdings")
async def get_holdings(email: str = Depends(get_current_user)):
    """Get raw portfolio holdings without P&L calculation."""
    try:
        holdings = get_portfolio_holdings(email)
        return {"holdings": holdings}
        
    except Exception as e:
        logger.error(f"Holdings fetch error: {e}")
        raise HTTPException(500, "Failed to fetch holdings")

@app.get("/api/portfolio/transactions")
async def get_transactions(
    symbol: Optional[str] = None,
    limit: int = 50,
    email: str = Depends(get_current_user)
):
    """Get portfolio transaction history."""
    try:
        transactions = get_portfolio_transactions(email, symbol, limit)
        
        # Convert datetime objects to ISO format strings
        for t in transactions:
            if t.get('transaction_date'):
                t['transaction_date'] = t['transaction_date'].isoformat()
        
        return {"transactions": transactions}
        
    except Exception as e:
        logger.error(f"Transactions fetch error: {e}")
        raise HTTPException(500, "Failed to fetch transactions")

@app.post("/api/portfolio/transaction")
async def create_transaction(txn: PortfolioTransaction, email: str = Depends(get_current_user)):
    """Add a buy or sell transaction to portfolio."""
    try:
        # Validate stock exists
        symbol = txn.symbol.upper().strip()
        all_stocks = screener()
        
        if not any(s.get('symbol') == symbol for s in all_stocks):
            raise HTTPException(404, f"Stock '{symbol}' not found")
        
        result = add_transaction(
            user_email=email,
            symbol=symbol,
            transaction_type=txn.transaction_type,
            quantity=txn.quantity,
            price=txn.price,
            notes=txn.notes
        )
        
        if not result['success']:
            raise HTTPException(400, result['message'])
        
        logger.info(f"Transaction added for {email}: {txn.transaction_type} {txn.quantity} {symbol}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transaction error: {e}")
        raise HTTPException(500, "Failed to process transaction")

@app.delete("/api/portfolio/transaction/{transaction_id}")
async def remove_transaction(transaction_id: int, email: str = Depends(get_current_user)):
    """Delete a transaction (for corrections)."""
    try:
        result = delete_transaction(email, transaction_id)
        
        if not result['success']:
            raise HTTPException(400, result['message'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transaction delete error: {e}")
        raise HTTPException(500, "Failed to delete transaction")


# ---------- FILTERS ----------
class StockFilter(BaseModel):
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_volume: Optional[int] = None
    max_volume: Optional[int] = None
    min_change: Optional[float] = None
    max_change: Optional[float] = None
    sectors: Optional[List[str]] = None

@app.post("/api/filter")
async def filter_stocks(filters: StockFilter):
    """Filter stocks based on criteria."""
    try:
        logger.info(f"Filtering stocks with criteria: {filters}")
        all_stocks = screener()
        
        filtered = all_stocks
        
        # Filter by price
        if filters.min_price is not None:
            filtered = [s for s in filtered if float(s.get('close') or 0) >= filters.min_price]
        if filters.max_price is not None:
            filtered = [s for s in filtered if float(s.get('close') or 0) <= filters.max_price]
        
        # Filter by volume
        if filters.min_volume is not None:
            filtered = [s for s in filtered if int(s.get('volume') or 0) >= filters.min_volume]
        if filters.max_volume is not None:
            filtered = [s for s in filtered if int(s.get('volume') or 0) <= filters.max_volume]
        
        # Filter by change percentage
        if filters.min_change is not None:
            filtered = [s for s in filtered if float(s.get('%chng') or 0) >= filters.min_change]
        if filters.max_change is not None:
            filtered = [s for s in filtered if float(s.get('%chng') or 0) <= filters.max_change]
        
        # Filter by sectors (if implemented)
        if filters.sectors:
            filtered = [s for s in filtered if s.get('sector') in filters.sectors]
        
        logger.info(f"Filtered to {len(filtered)} stocks")
        return filtered
        
    except Exception as e:
        logger.error(f"Filter error: {e}")
        raise HTTPException(500, "Failed to filter stocks")

# ---------- STOCK ALERTS ----------
from services.alert_service import (
    get_user_alerts, create_alert, delete_alert, toggle_alert,
    check_alerts, detect_sudden_changes, get_market_movers
)

class AlertCreate(BaseModel):
    symbol: str
    alert_type: str  # 'price_above', 'price_below', 'change_up', 'change_down'
    threshold: float

@app.get("/api/alerts")
async def get_alerts(email: str = Depends(get_current_user)):
    """Get user's stock alerts."""
    try:
        alerts = get_user_alerts(email)
        
        # Convert datetime objects
        for a in alerts:
            if a.get('created_at'):
                a['created_at'] = a['created_at'].isoformat()
            if a.get('triggered_at'):
                a['triggered_at'] = a['triggered_at'].isoformat()
        
        logger.info(f"Fetched {len(alerts)} alerts for {email}")
        return {"alerts": alerts}
        
    except Exception as e:
        logger.error(f"Alerts fetch error: {e}")
        raise HTTPException(500, "Failed to fetch alerts")

@app.post("/api/alerts")
async def add_alert(alert: AlertCreate, email: str = Depends(get_current_user)):
    """Create a new stock alert."""
    try:
        result = create_alert(
            user_email=email,
            symbol=alert.symbol,
            alert_type=alert.alert_type,
            threshold=alert.threshold
        )
        
        if not result['success']:
            raise HTTPException(400, result['message'])
        
        logger.info(f"Alert created for {email}: {alert.symbol} {alert.alert_type}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert create error: {e}")
        raise HTTPException(500, "Failed to create alert")

@app.delete("/api/alerts/{alert_id}")
async def remove_alert(alert_id: int, email: str = Depends(get_current_user)):
    """Delete a stock alert."""
    try:
        result = delete_alert(email, alert_id)
        
        if not result['success']:
            raise HTTPException(400, result['message'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert delete error: {e}")
        raise HTTPException(500, "Failed to delete alert")

@app.patch("/api/alerts/{alert_id}/toggle")
async def toggle_alert_status(alert_id: int, email: str = Depends(get_current_user)):
    """Toggle alert active/inactive status."""
    try:
        result = toggle_alert(email, alert_id)
        
        if not result['success']:
            raise HTTPException(400, result['message'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert toggle error: {e}")
        raise HTTPException(500, "Failed to toggle alert")

@app.get("/api/alerts/check")
async def check_user_alerts(email: str = Depends(get_current_user)):
    """Check if any user alerts are triggered based on current stock prices."""
    try:
        all_stocks = screener()
        triggered = check_alerts(email, all_stocks)
        
        return {"triggered_alerts": triggered, "count": len(triggered)}
        
    except Exception as e:
        logger.error(f"Alert check error: {e}")
        raise HTTPException(500, "Failed to check alerts")

@app.get("/api/alerts/sudden-changes")
async def get_sudden_changes(threshold: float = 3.0):
    """Get stocks with sudden price changes (no auth required for market monitoring)."""
    try:
        all_stocks = screener()
        sudden = detect_sudden_changes(all_stocks, threshold)
        
        return {"sudden_changes": sudden, "threshold": threshold, "count": len(sudden)}
        
    except Exception as e:
        logger.error(f"Sudden changes error: {e}")
        raise HTTPException(500, "Failed to detect sudden changes")

@app.get("/api/alerts/market-movers")
async def get_movers(limit: int = 5):
    """Get top gainers and losers."""
    try:
        all_stocks = screener()
        movers = get_market_movers(all_stocks, limit)
        
        return movers
        
    except Exception as e:
        logger.error(f"Market movers error: {e}")
        raise HTTPException(500, "Failed to get market movers")

# ---------- DEVELOPER/ADMIN ----------
class StockDataInsert(BaseModel):
    symbol: str
    company: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    prev_close: Optional[float] = None

@app.post("/api/admin/insert-stock-data")
async def insert_stock_data(data: StockDataInsert, email: str = Depends(get_current_user)):
    """Admin endpoint to insert stock data (requires authentication)."""
    try:
        # Check if user is admin (you can add a role check here)
        logger.info(f"Stock data insertion request from {email}")
        
        # This is a placeholder - in production, you would:
        # 1. Verify the user has admin privileges
        # 2. Validate the data
        # 3. Insert into a database or CSV file
        # 4. Reload the stock service data
        
        # For now, we'll just log it as a privacy-safe operation
        logger.info(f"Data insertion: {data.symbol} - {data.company} for date {data.date}")
        logger.info(f"OHLCV: O={data.open}, H={data.high}, L={data.low}, C={data.close}, V={data.volume}")
        
        return {
            "success": True,
            "message": f"Data for {data.symbol} recorded successfully",
            "note": "This is a simulation. In production, data would be written to CSV/database."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data insertion error: {e}")
        raise HTTPException(500, "Failed to insert stock data")

# Error handlers
from fastapi.responses import JSONResponse

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Resource not found", "status_code": 404}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500}
    )

# ---------- DEBUG ENDPOINT ----------
@app.get("/api/debug/check-db")
async def check_database():
    """Debug endpoint to check database connectivity."""
    try:
        pending = fetch_all("SELECT email FROM pending_user")
        users = fetch_all("SELECT email FROM users")
        otps = fetch_all("SELECT email FROM otp")
        
        return {
            "database_connected": True,
            "pending_users_count": len(pending),
            "verified_users_count": len(users),
            "otp_entries_count": len(otps),
            "pending_emails": [p['email'] for p in pending],
            "verified_emails": [u['email'] for u in users]
        }
    except Exception as e:
        logger.error(f"Database check error: {e}")
        return {"database_connected": False, "error": str(e)}
