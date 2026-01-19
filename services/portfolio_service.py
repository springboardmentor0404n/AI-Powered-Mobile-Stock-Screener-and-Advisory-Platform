"""
Portfolio Service - Handles portfolio holdings and transactions
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from database import execute, fetch_one, fetch_all

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_portfolio_holdings(user_email: str) -> List[Dict[str, Any]]:
    """
    Get all portfolio holdings for a user with current prices and P&L.
    
    Args:
        user_email: User's email address
        
    Returns:
        List of holdings with current value and profit/loss
    """
    try:
        holdings = fetch_all(
            """
            SELECT id, symbol, quantity, avg_buy_price, total_invested, created_at, updated_at
            FROM portfolio_holdings
            WHERE user_email = :email AND quantity > 0
            ORDER BY total_invested DESC
            """,
            {"email": user_email}
        )
        
        logger.info(f"Fetched {len(holdings)} holdings for {user_email}")
        return holdings
        
    except Exception as e:
        logger.error(f"Error fetching portfolio holdings: {e}")
        return []


def get_portfolio_transactions(user_email: str, symbol: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get transaction history for a user.
    
    Args:
        user_email: User's email address
        symbol: Optional symbol to filter by
        limit: Maximum number of transactions to return
        
    Returns:
        List of transactions
    """
    try:
        if symbol:
            transactions = fetch_all(
                """
                SELECT id, symbol, transaction_type, quantity, price, total_amount, notes, transaction_date
                FROM portfolio_transactions
                WHERE user_email = :email AND symbol = :symbol
                ORDER BY transaction_date DESC
                LIMIT :limit
                """,
                {"email": user_email, "symbol": symbol.upper(), "limit": limit}
            )
        else:
            transactions = fetch_all(
                """
                SELECT id, symbol, transaction_type, quantity, price, total_amount, notes, transaction_date
                FROM portfolio_transactions
                WHERE user_email = :email
                ORDER BY transaction_date DESC
                LIMIT :limit
                """,
                {"email": user_email, "limit": limit}
            )
        
        logger.info(f"Fetched {len(transactions)} transactions for {user_email}")
        return transactions
        
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return []


def add_transaction(
    user_email: str,
    symbol: str,
    transaction_type: str,
    quantity: float,
    price: float,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add a buy or sell transaction and update holdings.
    
    Args:
        user_email: User's email address
        symbol: Stock symbol
        transaction_type: 'BUY' or 'SELL'
        quantity: Number of shares
        price: Price per share
        notes: Optional transaction notes
        
    Returns:
        Result with success status and message
    """
    try:
        symbol = symbol.upper().strip()
        transaction_type = transaction_type.upper()
        
        if transaction_type not in ['BUY', 'SELL']:
            return {"success": False, "message": "Transaction type must be BUY or SELL"}
        
        if quantity <= 0:
            return {"success": False, "message": "Quantity must be greater than 0"}
        
        if price <= 0:
            return {"success": False, "message": "Price must be greater than 0"}
        
        total_amount = quantity * price
        
        # Get current holding
        current_holding = fetch_one(
            "SELECT * FROM portfolio_holdings WHERE user_email = :email AND symbol = :symbol",
            {"email": user_email, "symbol": symbol}
        )
        
        if transaction_type == 'SELL':
            # Check if user has enough shares to sell
            if not current_holding or float(current_holding['quantity']) < quantity:
                current_qty = float(current_holding['quantity']) if current_holding else 0
                return {
                    "success": False, 
                    "message": f"Insufficient shares. You have {current_qty} shares of {symbol}"
                }
            
            # Update holding after sell
            new_quantity = float(current_holding['quantity']) - quantity
            
            if new_quantity == 0:
                # Remove holding if all shares sold
                execute(
                    "DELETE FROM portfolio_holdings WHERE user_email = :email AND symbol = :symbol",
                    {"email": user_email, "symbol": symbol}
                )
            else:
                # Update quantity (keep avg price same)
                new_total_invested = new_quantity * float(current_holding['avg_buy_price'])
                execute(
                    """
                    UPDATE portfolio_holdings 
                    SET quantity = :qty, total_invested = :invested, updated_at = CURRENT_TIMESTAMP
                    WHERE user_email = :email AND symbol = :symbol
                    """,
                    {"email": user_email, "symbol": symbol, "qty": new_quantity, "invested": new_total_invested}
                )
        
        else:  # BUY
            if current_holding:
                # Update existing holding with weighted average price
                old_qty = float(current_holding['quantity'])
                old_invested = float(current_holding['total_invested'])
                
                new_quantity = old_qty + quantity
                new_invested = old_invested + total_amount
                new_avg_price = new_invested / new_quantity
                
                execute(
                    """
                    UPDATE portfolio_holdings 
                    SET quantity = :qty, avg_buy_price = :avg_price, total_invested = :invested, updated_at = CURRENT_TIMESTAMP
                    WHERE user_email = :email AND symbol = :symbol
                    """,
                    {"email": user_email, "symbol": symbol, "qty": new_quantity, "avg_price": new_avg_price, "invested": new_invested}
                )
            else:
                # Create new holding
                execute(
                    """
                    INSERT INTO portfolio_holdings (user_email, symbol, quantity, avg_buy_price, total_invested)
                    VALUES (:email, :symbol, :qty, :avg_price, :invested)
                    """,
                    {"email": user_email, "symbol": symbol, "qty": quantity, "avg_price": price, "invested": total_amount}
                )
        
        # Record the transaction
        execute(
            """
            INSERT INTO portfolio_transactions (user_email, symbol, transaction_type, quantity, price, total_amount, notes)
            VALUES (:email, :symbol, :type, :qty, :price, :amount, :notes)
            """,
            {
                "email": user_email,
                "symbol": symbol,
                "type": transaction_type,
                "qty": quantity,
                "price": price,
                "amount": total_amount,
                "notes": notes
            }
        )
        
        logger.info(f"Transaction recorded: {transaction_type} {quantity} {symbol} @ {price} for {user_email}")
        
        return {
            "success": True,
            "message": f"Successfully {transaction_type.lower()} {quantity} shares of {symbol} @ ₹{price:.2f}",
            "total_amount": total_amount
        }
        
    except Exception as e:
        logger.error(f"Error adding transaction: {e}")
        return {"success": False, "message": f"Transaction failed: {str(e)}"}


def get_portfolio_summary(user_email: str, current_prices: Dict[str, float]) -> Dict[str, Any]:
    """
    Get portfolio summary with total value, P&L, and allocation.
    
    Args:
        user_email: User's email address
        current_prices: Dictionary of symbol -> current price
        
    Returns:
        Portfolio summary with metrics
    """
    try:
        holdings = get_portfolio_holdings(user_email)
        
        if not holdings:
            return {
                "total_invested": 0,
                "current_value": 0,
                "total_pnl": 0,
                "total_pnl_percent": 0,
                "holdings_count": 0,
                "holdings": []
            }
        
        total_invested = 0
        current_value = 0
        holdings_with_pnl = []
        
        for holding in holdings:
            symbol = holding['symbol']
            qty = float(holding['quantity'])
            avg_price = float(holding['avg_buy_price'])
            invested = float(holding['total_invested'])
            
            current_price = current_prices.get(symbol, avg_price)
            holding_value = qty * current_price
            pnl = holding_value - invested
            pnl_percent = (pnl / invested * 100) if invested > 0 else 0
            
            total_invested += invested
            current_value += holding_value
            
            holdings_with_pnl.append({
                "symbol": symbol,
                "quantity": qty,
                "avg_buy_price": avg_price,
                "total_invested": invested,
                "current_price": current_price,
                "current_value": holding_value,
                "pnl": pnl,
                "pnl_percent": pnl_percent,
                "allocation": 0  # Will be calculated below
            })
        
        # Calculate allocation percentages
        for h in holdings_with_pnl:
            h['allocation'] = (h['current_value'] / current_value * 100) if current_value > 0 else 0
        
        total_pnl = current_value - total_invested
        total_pnl_percent = (total_pnl / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_percent": round(total_pnl_percent, 2),
            "holdings_count": len(holdings_with_pnl),
            "holdings": sorted(holdings_with_pnl, key=lambda x: x['current_value'], reverse=True)
        }
        
    except Exception as e:
        logger.error(f"Error getting portfolio summary: {e}")
        return {
            "total_invested": 0,
            "current_value": 0,
            "total_pnl": 0,
            "total_pnl_percent": 0,
            "holdings_count": 0,
            "holdings": [],
            "error": str(e)
        }


def delete_transaction(user_email: str, transaction_id: int) -> Dict[str, Any]:
    """
    Delete a transaction (admin/correction purposes).
    Note: This does NOT automatically adjust holdings - manual reconciliation needed.
    
    Args:
        user_email: User's email address
        transaction_id: Transaction ID to delete
        
    Returns:
        Result with success status
    """
    try:
        # Verify transaction belongs to user
        transaction = fetch_one(
            "SELECT * FROM portfolio_transactions WHERE id = :id AND user_email = :email",
            {"id": transaction_id, "email": user_email}
        )
        
        if not transaction:
            return {"success": False, "message": "Transaction not found"}
        
        execute(
            "DELETE FROM portfolio_transactions WHERE id = :id AND user_email = :email",
            {"id": transaction_id, "email": user_email}
        )
        
        logger.info(f"Deleted transaction {transaction_id} for {user_email}")
        return {"success": True, "message": "Transaction deleted"}
        
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        return {"success": False, "message": f"Delete failed: {str(e)}"}
