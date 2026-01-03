from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class StockBase(BaseModel):
    symbol: str
    company_name: str
    sector: str
    current_price: float
    market_cap: float

class StockResponse(StockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class WatchlistAdd(BaseModel):
    symbol: str

class ScreenerQuery(BaseModel):
    query: str

class ScreenerResponse(BaseModel):
    type: str  # "stock_detail" or "screener_results"
    data: Any
    metadata: Optional[Dict[str, Any]] = None
