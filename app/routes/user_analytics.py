from fastapi import APIRouter
watchlist = set()
router = APIRouter()

@router.post("/watchlist/{symbol}")
def add_watchlist(symbol: str):
    watchlist.add(symbol.upper())
    return {"message": "Added"}

@router.get("/watchlist")
def get_watchlist():
    return list(watchlist)

portfolio = []

@router.post("/portfolio")
def add_portfolio(item: dict):
    portfolio.append(item)
    return {"message": "Added"}

@router.get("/portfolio")
def get_portfolio():
    return portfolio
