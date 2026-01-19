"""
Stock Alert Service
Monitors stock price changes and triggers alerts for sudden movements
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from database import execute, fetch_one, fetch_all

logger = logging.getLogger(__name__)

# Default threshold for "sudden change" detection (percentage)
DEFAULT_CHANGE_THRESHOLD = 3.0  # 3% change triggers alert

def get_user_alerts(user_email: str) -> List[Dict]:
    """Get all alerts for a user."""
    try:
        alerts = fetch_all(
            """SELECT id, symbol, alert_type, threshold, is_active, created_at, triggered_at, triggered_price
               FROM stock_alerts 
               WHERE user_email = :email 
               ORDER BY created_at DESC""",
            {"email": user_email}
        )
        return alerts or []
    except Exception as e:
        logger.error(f"Error fetching alerts for {user_email}: {e}")
        return []

def create_alert(user_email: str, symbol: str, alert_type: str, threshold: float) -> Dict:
    """
    Create a new price alert.
    
    Args:
        user_email: User's email
        symbol: Stock symbol (e.g., 'RELIANCE')
        alert_type: 'price_above', 'price_below', 'change_up', 'change_down'
        threshold: Target price or percentage change
    
    Returns:
        Success/failure dict with message
    """
    try:
        symbol = symbol.upper().strip()
        
        # Validate alert_type
        valid_types = ['price_above', 'price_below', 'change_up', 'change_down']
        if alert_type not in valid_types:
            return {"success": False, "message": f"Invalid alert type. Must be one of: {valid_types}"}
        
        # Check if similar alert already exists
        existing = fetch_one(
            """SELECT id FROM stock_alerts 
               WHERE user_email = :email AND symbol = :symbol 
               AND alert_type = :type AND is_active = true""",
            {"email": user_email, "symbol": symbol, "type": alert_type}
        )
        
        if existing:
            return {"success": False, "message": f"Active alert already exists for {symbol} ({alert_type})"}
        
        execute(
            """INSERT INTO stock_alerts (user_email, symbol, alert_type, threshold, is_active, created_at)
               VALUES (:email, :symbol, :type, :threshold, true, :created_at)""",
            {
                "email": user_email,
                "symbol": symbol,
                "type": alert_type,
                "threshold": threshold,
                "created_at": datetime.utcnow()
            }
        )
        
        logger.info(f"Alert created for {user_email}: {symbol} {alert_type} at {threshold}")
        return {"success": True, "message": f"Alert created for {symbol}"}
        
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        return {"success": False, "message": "Failed to create alert"}

def delete_alert(user_email: str, alert_id: int) -> Dict:
    """Delete a user's alert."""
    try:
        # Verify ownership
        alert = fetch_one(
            "SELECT id FROM stock_alerts WHERE id = :id AND user_email = :email",
            {"id": alert_id, "email": user_email}
        )
        
        if not alert:
            return {"success": False, "message": "Alert not found"}
        
        execute("DELETE FROM stock_alerts WHERE id = :id", {"id": alert_id})
        
        logger.info(f"Alert {alert_id} deleted for {user_email}")
        return {"success": True, "message": "Alert deleted"}
        
    except Exception as e:
        logger.error(f"Error deleting alert: {e}")
        return {"success": False, "message": "Failed to delete alert"}

def toggle_alert(user_email: str, alert_id: int) -> Dict:
    """Toggle alert active status."""
    try:
        alert = fetch_one(
            "SELECT id, is_active FROM stock_alerts WHERE id = :id AND user_email = :email",
            {"id": alert_id, "email": user_email}
        )
        
        if not alert:
            return {"success": False, "message": "Alert not found"}
        
        new_status = not alert['is_active']
        execute(
            "UPDATE stock_alerts SET is_active = :status WHERE id = :id",
            {"status": new_status, "id": alert_id}
        )
        
        status_text = "activated" if new_status else "paused"
        return {"success": True, "message": f"Alert {status_text}", "is_active": new_status}
        
    except Exception as e:
        logger.error(f"Error toggling alert: {e}")
        return {"success": False, "message": "Failed to toggle alert"}

def check_alerts(user_email: str, stocks_data: List[Dict]) -> List[Dict]:
    """
    Check if any user alerts should be triggered based on current stock data.
    
    Args:
        user_email: User's email
        stocks_data: List of current stock data from screener
    
    Returns:
        List of triggered alerts with stock info
    """
    try:
        # Get active alerts for user
        active_alerts = fetch_all(
            """SELECT id, symbol, alert_type, threshold 
               FROM stock_alerts 
               WHERE user_email = :email AND is_active = true""",
            {"email": user_email}
        )
        
        if not active_alerts:
            return []
        
        # Create lookup for stock data
        stock_lookup = {s.get('symbol', '').upper(): s for s in stocks_data}
        
        triggered = []
        
        for alert in active_alerts:
            symbol = alert['symbol']
            stock = stock_lookup.get(symbol)
            
            if not stock:
                continue
            
            current_price = float(stock.get('close') or stock.get('last') or 0)
            change_pct = float(stock.get('%chng') or 0)
            threshold = float(alert['threshold'])
            alert_type = alert['alert_type']
            
            is_triggered = False
            message = ""
            
            if alert_type == 'price_above' and current_price >= threshold:
                is_triggered = True
                message = f"🚀 {symbol} crossed above ₹{threshold:.2f}! Current: ₹{current_price:.2f}"
            elif alert_type == 'price_below' and current_price <= threshold:
                is_triggered = True
                message = f"📉 {symbol} dropped below ₹{threshold:.2f}! Current: ₹{current_price:.2f}"
            elif alert_type == 'change_up' and change_pct >= threshold:
                is_triggered = True
                message = f"📈 {symbol} surged {change_pct:.2f}%! (Threshold: {threshold}%)"
            elif alert_type == 'change_down' and change_pct <= -threshold:
                is_triggered = True
                message = f"⚠️ {symbol} dropped {abs(change_pct):.2f}%! (Threshold: {threshold}%)"
            
            if is_triggered:
                # Update triggered status in database
                execute(
                    """UPDATE stock_alerts 
                       SET triggered_at = :triggered_at, triggered_price = :price
                       WHERE id = :id""",
                    {
                        "triggered_at": datetime.utcnow(),
                        "price": current_price,
                        "id": alert['id']
                    }
                )
                
                triggered.append({
                    "alert_id": alert['id'],
                    "symbol": symbol,
                    "alert_type": alert_type,
                    "threshold": threshold,
                    "current_price": current_price,
                    "change_pct": change_pct,
                    "message": message
                })
        
        return triggered
        
    except Exception as e:
        logger.error(f"Error checking alerts: {e}")
        return []

def detect_sudden_changes(stocks_data: List[Dict], threshold: float = DEFAULT_CHANGE_THRESHOLD) -> List[Dict]:
    """
    Detect stocks with sudden price changes (for global monitoring).
    
    Args:
        stocks_data: List of current stock data
        threshold: Percentage change to consider "sudden" (default 3%)
    
    Returns:
        List of stocks with sudden changes
    """
    sudden_changes = []
    
    for stock in stocks_data:
        try:
            symbol = stock.get('symbol', 'N/A')
            change_pct = float(stock.get('%chng') or 0)
            current_price = float(stock.get('close') or stock.get('last') or 0)
            
            if abs(change_pct) >= threshold:
                direction = "up" if change_pct > 0 else "down"
                emoji = "🚀" if change_pct > 0 else "📉"
                
                sudden_changes.append({
                    "symbol": symbol,
                    "change_pct": round(change_pct, 2),
                    "current_price": round(current_price, 2),
                    "direction": direction,
                    "message": f"{emoji} {symbol} is {direction} {abs(change_pct):.2f}% at ₹{current_price:.2f}"
                })
        except (ValueError, TypeError):
            continue
    
    # Sort by absolute change (highest first)
    sudden_changes.sort(key=lambda x: abs(x['change_pct']), reverse=True)
    
    return sudden_changes

def get_market_movers(stocks_data: List[Dict], limit: int = 5) -> Dict:
    """
    Get top gainers and losers for market alerts.
    
    Returns:
        Dict with 'gainers' and 'losers' lists
    """
    try:
        valid_stocks = []
        for stock in stocks_data:
            try:
                change = float(stock.get('%chng') or 0)
                price = float(stock.get('close') or stock.get('last') or 0)
                if price > 0:
                    valid_stocks.append({
                        "symbol": stock.get('symbol'),
                        "change_pct": round(change, 2),
                        "price": round(price, 2)
                    })
            except (ValueError, TypeError):
                continue
        
        # Sort for gainers and losers
        sorted_stocks = sorted(valid_stocks, key=lambda x: x['change_pct'], reverse=True)
        
        gainers = sorted_stocks[:limit]
        losers = sorted_stocks[-limit:][::-1]  # Reverse to show biggest losers first
        
        return {
            "gainers": gainers,
            "losers": losers
        }
        
    except Exception as e:
        logger.error(f"Error getting market movers: {e}")
        return {"gainers": [], "losers": []}
