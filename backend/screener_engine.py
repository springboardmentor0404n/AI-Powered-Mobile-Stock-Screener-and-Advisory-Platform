from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from models import Stock, Fundamentals, Technicals
from schemas import ScreenerResponse, StockResponse
import logging

logger = logging.getLogger(__name__)

FIELD_MAP = {
    # Stock fields
    "market_cap": Stock.market_cap,
    "current_price": Stock.current_price,
    "sector": Stock.sector,
    "company_name": Stock.company_name,
    
    # Fundamentals fields
    "pe_ratio": Fundamentals.pe_ratio,
    "roe": Fundamentals.roe,
    "debt_to_equity": Fundamentals.debt_to_equity,
    "eps": Fundamentals.eps,
    "div_yield": Fundamentals.div_yield,
    "book_value": Fundamentals.book_value,
    "profit_growth": Fundamentals.profit_growth,
    "sales_growth": Fundamentals.sales_growth,
    
    # Technicals
    "rsi": Technicals.rsi_14,
    "macd": Technicals.macd
}

OPERATOR_MAP = {
    ">": lambda f, v: f > v,
    "<": lambda f, v: f < v,
    ">=": lambda f, v: f >= v,
    "<=": lambda f, v: f <= v,
    "=": lambda f, v: f == v,
    "contains": lambda f, v: f.ilike(f"%{v}%")
}

async def execute_screener_query(dsl_json: dict, db: AsyncSession):
    intent = dsl_json.get("intent")
    
    if intent == "STOCK_DETAIL":
        symbol_query = dsl_json.get("symbol", "").upper()
        # Try exact match first
        stmt = select(Stock).where(Stock.symbol == symbol_query)
        result = await db.execute(stmt)
        stock = result.scalars().first()
        
        if not stock:
            # Try fuzzy match on name
             stmt = select(Stock).where(Stock.company_name.ilike(f"%{symbol_query}%"))
             result = await db.execute(stmt)
             stock = result.scalars().first()

        if stock:
            # Fetch related data
            # SQLAlchemy async relationships often need explicit loading or join, 
            # but we set lazy='select' (default). 
            # Ideally use join in query for perf, but for detail view lazy load is acceptble if session open.
            # Actually with async, lazy load fails if not awaited properly or using select options.
            # Let's do a join fetch for safety.
            # We have the stock object. The frontend will request full details via /stock/{symbol}
            # So returning this lightweight object is sufficient.
            pass
            return ScreenerResponse(type="stock_detail", data=StockResponse.model_validate(stock), metadata={"symbol": stock.symbol})
        else:
            return ScreenerResponse(type="error", data="Stock not found")

    elif intent == "SCREENER":
        criteria_list = dsl_json.get("criteria", [])
        
        # Base query joining all tables
        stmt = select(Stock).join(Fundamentals).outerjoin(Technicals)
        
        conditions = []
        for crit in criteria_list:
            field = crit.get("field")
            op = crit.get("operator")
            val = crit.get("value")
            
            db_field = FIELD_MAP.get(field)
            if db_field and op in OPERATOR_MAP:
                conditions.append(OPERATOR_MAP[op](db_field, val))
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.limit(50) # Safety limit
        
        result = await db.execute(stmt)
        stocks = result.scalars().all()
        
        return ScreenerResponse(type="screener_results", data=[StockResponse.model_validate(s) for s in stocks])
    
    return ScreenerResponse(type="error", data="Unknown intent")
