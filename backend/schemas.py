from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPValidateRequest(BaseModel):
    email: EmailStr
    otp: str

class VerifySignupRequest(BaseModel):
    email: EmailStr
    password: str
    otp: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class StockBase(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    current_price: Optional[float] = None
    previous_close: Optional[float] = None
    market_cap: Optional[float] = None

class StockResponse(StockBase):
    id: int
    # existing fields...
    
    # Add optional relationships for simple fetching if needed, 
    # but mainly we will use dedicated endpoints.
    
    model_config = ConfigDict(from_attributes=True)

class WatchlistAdd(BaseModel):
    symbol: str

class ScreenerQuery(BaseModel):
    query: str

class ScreenerResponse(BaseModel):
    type: str  # "stock_detail" or "screener_results"
    data: Any
    metadata: Optional[Dict[str, Any]] = None

class AlertCreate(BaseModel):
    stock_id: int
    target_price: float
    condition: str # "ABOVE" | "BELOW"

class AlertResponse(BaseModel):
    id: int
    stock: StockResponse
    target_price: float
    condition: str
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PortfolioAdd(BaseModel):
    stock_id: int
    quantity: int
    price: float

class PortfolioSell(BaseModel):
    stock_id: int
    quantity: int
    price: float

class PortfolioItem(BaseModel):
    id: int
    stock: StockResponse
    quantity: int
    avg_price: float
    current_value: float
    invested_value: float
    pnl: float
    pnl_percent: float
    
    model_config = ConfigDict(from_attributes=True)

class FundamentalsBase(BaseModel):
    pe_ratio: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    eps: Optional[float] = None
    div_yield: Optional[float] = None
    book_value: Optional[float] = None
    profit_growth: Optional[float] = None
    sales_growth: Optional[float] = None
    
    # Financials History (JSON Strings)
    revenue_history: Optional[str] = None
    profit_history: Optional[str] = None
    shareholding: Optional[str] = None

class FundamentalsResponse(FundamentalsBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class NewsResponse(BaseModel):
    id: int
    headline: str
    summary: Optional[str] = None
    sentiment: str
    url: Optional[str] = None
    published_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
