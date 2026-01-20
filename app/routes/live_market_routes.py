from fastapi import APIRouter
from app.services.live_market import get_live_price, get_price_history

router = APIRouter()

@router.get("/live-price/{symbol}")
def live_price(symbol: str):
    return get_live_price(symbol)


@router.get("/history/{symbol}")
def price_history(symbol: str):
    return get_price_history(symbol)
