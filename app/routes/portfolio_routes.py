from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()

# TEMP in-memory portfolio store (later can be DB)
portfolio_db = [
    {
        "symbol": "TCS.NS",
        "qty": 10,
        "buy_price": 3200
    },
    {
        "symbol": "INFY.NS",
        "qty": 15,
        "buy_price": 1400
    }
]

@router.get("/portfolio")
def get_portfolio():
    return portfolio_db
class BuyStockRequest(BaseModel):
    symbol: str
    qty: int
    price: float

@router.post("/portfolio/buy")
def buy_stock(req: BuyStockRequest):

    # Check if stock already exists
    for stock in portfolio_db:
        if stock["symbol"] == req.symbol:
            total_qty = stock["qty"] + req.qty

            avg_price = (
                (stock["qty"] * stock["buy_price"]) +
                (req.qty * req.price)
            ) / total_qty

            stock["qty"] = total_qty
            stock["buy_price"] = round(avg_price, 2)

            return {
                "message": "Stock updated",
                "portfolio": portfolio_db
            }

    # New stock
    portfolio_db.append({
        "symbol": req.symbol,
        "qty": req.qty,
        "buy_price": req.price
    })

    return {
        "message": "Stock bought",
        "portfolio": portfolio_db
    }



