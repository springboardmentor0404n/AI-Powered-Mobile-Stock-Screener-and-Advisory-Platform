from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from dependencies import get_current_user, get_watchlist_collection
from angelone_service import get_stock_quote_angel, get_stock_quote_angel_async
from yahoo_service import get_stock_fundamentals
from datetime import datetime
import asyncio

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

# Models
class StockNote(BaseModel):
    thesis: Optional[str] = None
    invalidation_condition: Optional[str] = None
    time_horizon: Optional[str] = None

class ScreenerCondition(BaseModel):
    name: str
    status: str  # "matched", "broken", "warning"
    current_value: Optional[str] = None
    threshold: Optional[str] = None

@router.get("/overview")
async def get_portfolio_overview(user: dict = Depends(get_current_user)):
    """Get portfolio overview statistics"""
    try:
        user_id = int(user["id"])
        storage = get_watchlist_collection()
        
        # Get all tracked stocks
        stocks = await storage.get_watchlist(user_id)
        
        if not stocks:
            return {
                "total_stocks": 0,
                "sectors": {},
                "market_caps": {"Large-cap": 0, "Mid-cap": 0, "Small-cap": 0},
                "risk_level": "N/A",
                "last_refresh": datetime.utcnow().isoformat(),
                "concentration": {},
                "top_sectors": {}
            }
        
        # Fetch current data for stocks
        stock_data = []
        sectors = {}
        market_caps = {"Large-cap": 0, "Mid-cap": 0, "Small-cap": 0}
        
        for stock in stocks:
            symbol = stock["symbol"].split('.')[0]
            exchange = stock.get("exchange", "NSE")
            
            try:
                quote = await get_stock_quote_angel_async(symbol, exchange)
                if quote:
                    ltp = quote.get("ltp", 0)
                    
                    # Estimate sector (in production, fetch from master data)
                    sector = estimate_sector(symbol)
                    sectors[sector] = sectors.get(sector, 0) + 1
                    
                    # Estimate market cap
                    cap_type = estimate_market_cap(symbol)
                    market_caps[cap_type] = market_caps.get(cap_type, 0) + 1
                    
                    stock_data.append({
                        "symbol": symbol,
                        "price": ltp,
                        "sector": sector
                    })
            except Exception as e:
                print(f"[PORTFOLIO] Error fetching {symbol}: {e}")
                continue
        
        # Calculate risk level
        risk_level = calculate_risk_level(len(stocks), sectors, market_caps)
        
        # Get top sectors
        top_sectors = sorted(sectors.items(), key=lambda x: x[1], reverse=True)[:2]
        
        # Calculate concentration
        concentration = {
            "top_3_percentage": calculate_concentration(stock_data, 3),
            "sector_concentration": dict(top_sectors) if top_sectors else {}
        }
        
        return {
            "total_stocks": len(stocks),
            "sectors": sectors,
            "market_caps": market_caps,
            "risk_level": risk_level,
            "last_refresh": datetime.utcnow().isoformat(),
            "concentration": concentration,
            "top_sectors": dict(top_sectors) if top_sectors else {}
        }
    except Exception as e:
        print(f"[PORTFOLIO OVERVIEW ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stocks")
async def get_portfolio_stocks(user: dict = Depends(get_current_user)):
    """Get detailed stock list with screener validation"""
    try:
        user_id = int(user["id"])
        storage = get_watchlist_collection()
        
        stocks = await storage.get_watchlist(user_id)
        
        detailed_stocks = []
        
        # Fetch data for all stocks
        for stock in stocks:
            symbol = stock["symbol"].split('.')[0]
            exchange = stock.get("exchange", "NSE")
            
            try:
                # Get comprehensive stock data
                stock_data = await get_stock_fundamentals_data(symbol, exchange)
                quote = stock_data.get("quote")
                
                if quote:
                    ltp = quote.get("ltp", 0)
                    # Use previous_close for accurate change calculation
                    prev_close = quote.get("previous_close") or quote.get("close", 0)
                    
                    # Calculate change percentage using changePercent from quote if available
                    change_pct = quote.get("changePercent")
                    if change_pct is None:
                        # Fallback calculation
                        change_pct = ((ltp - prev_close) / prev_close * 100) if prev_close else 0
                    
                    # Get screener validation with real data
                    screener_status = validate_screener_conditions(symbol, stock_data)
                    
                    # Get trend
                    trend = calculate_trend(change_pct)
                    
                    detailed_stocks.append({
                        "symbol": symbol,
                        "company": stock.get("company", symbol),
                        "sector": estimate_sector(symbol),
                        "price": round(ltp, 2),
                        "change_percent": round(change_pct, 2),
                        "trend": trend,
                        "screener_status": screener_status,
                        "notes": stock.get("notes") or "",
                        "added_date": stock.get("added_at") or stock.get("created_at", ""),
                        "exchange": exchange
                    })
            except Exception as e:
                print(f"[PORTFOLIO STOCKS] Error with {symbol}: {e}")
                continue
        
        return {"stocks": detailed_stocks}
    except Exception as e:
        print(f"[PORTFOLIO STOCKS ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis")
async def get_portfolio_analysis(user: dict = Depends(get_current_user)):
    """Get portfolio-level analysis"""
    try:
        user_id = int(user["id"])
        storage = get_watchlist_collection()
        
        stocks = await storage.get_watchlist(user_id)
        
        if not stocks:
            return {
                "sector_allocation": {},
                "factor_bias": {},
                "concentration_warnings": [],
                "correlation_analysis": {}
            }
        
        # Fetch comprehensive data for all stocks
        stock_details = []
        sectors = {}
        
        for stock in stocks:
            symbol = stock["symbol"].split('.')[0]
            exchange = stock.get("exchange", "NSE")
            
            try:
                stock_data = await get_stock_fundamentals_data(symbol, exchange)
                quote = stock_data.get("quote")
                
                if quote:
                    sector = estimate_sector(symbol)
                    sectors[sector] = sectors.get(sector, 0) + 1
                    
                    stock_details.append({
                        "symbol": symbol,
                        "sector": sector,
                        "price": quote.get("ltp", 0),
                        "pe_ratio": stock_data.get("pe_ratio"),
                        "debt_equity": stock_data.get("debt_equity"),
                        "roe": stock_data.get("roe")
                    })
            except Exception as e:
                print(f"[ANALYSIS] Error with {symbol}: {e}")
                continue
        
        # Calculate sector allocation percentages
        total = len(stock_details)
        sector_allocation = {k: round((v/total)*100, 1) for k, v in sectors.items()} if total > 0 else {}
        
        # Factor bias analysis with real data
        factor_bias = analyze_factor_bias(stock_details)
        
        # Concentration warnings
        warnings = []
        
        # Top 3 concentration
        if total >= 3:
            top_3_pct = round((3/total)*100, 1)
            if top_3_pct > 50:
                warnings.append(f"Top 3 stocks = {top_3_pct}% of tracked universe")
        
        # Sector concentration
        for sector, count in sectors.items():
            pct = round((count/total)*100, 1)
            if pct > 40:
                warnings.append(f"{sector} sector accounts for {pct}% of portfolio")
        
        # Correlation analysis (simplified - sector based)
        dominant_sectors = [s for s, c in sectors.items() if (c/total) > 0.2] if total > 0 else []
        correlation_analysis = {
            "high_correlation_pairs": [],
            "sector_correlation": dominant_sectors
        }
        
        if len(dominant_sectors) > 1:
            warnings.append(f"Multiple dominant sectors may have correlated movements")
        
        return {
            "sector_allocation": sector_allocation,
            "factor_bias": factor_bias,
            "concentration_warnings": warnings,
            "correlation_analysis": correlation_analysis
        }
    except Exception as e:
        print(f"[PORTFOLIO ANALYSIS ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screener-match/{symbol}")
async def get_screener_match(symbol: str, user: dict = Depends(get_current_user)):
    """Get detailed screener match breakdown for a stock"""
    try:
        # Get comprehensive stock data
        stock_data = await get_stock_fundamentals_data(symbol, "NSE")
        quote = stock_data.get("quote")
        
        if not quote:
            raise HTTPException(status_code=404, detail="Stock data not found")
        
        # Generate actual conditions based on real data
        conditions = await generate_screener_conditions(symbol, stock_data)
        
        matched = sum(1 for c in conditions if c["status"] == "matched")
        total = len(conditions)
        
        # Determine overall status
        if matched == total and total > 0:
            overall_status = "fully_matched"
        elif matched > total * 0.5:
            overall_status = "partially_matched"
        else:
            overall_status = "not_matched"
        
        return {
            "symbol": symbol,
            "total_conditions": total,
            "matched_conditions": matched,
            "conditions": conditions,
            "overall_status": overall_status
        }
    except Exception as e:
        print(f"[SCREENER MATCH ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/signals")
async def get_advisory_signals(user: dict = Depends(get_current_user)):
    """Get portfolio-wide advisory signals (not trading recommendations)"""
    try:
        user_id = int(user["id"])
        storage = get_watchlist_collection()
        
        stocks = await storage.get_watchlist(user_id)
        
        signals = []
        
        # Limit to 20 stocks to avoid overload
        for stock in stocks[:20]:
            symbol = stock["symbol"].split('.')[0]
            
            try:
                # Get comprehensive stock data
                stock_data = await get_stock_fundamentals_data(symbol, "NSE")
                
                # Generate signals based on real data
                stock_signals = await generate_advisory_signals(symbol, stock_data)
                signals.extend(stock_signals)
            except Exception as e:
                print(f"[SIGNALS] Error for {symbol}: {e}")
                continue
        
        # Sort by severity (warnings first)
        signals.sort(key=lambda x: 0 if x["severity"] == "warning" else 1 if x["severity"] == "info" else 2)
        
        return {"signals": signals}
    except Exception as e:
        print(f"[SIGNALS ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-summary")
async def get_ai_portfolio_summary(user: dict = Depends(get_current_user)):
    """Generate AI summary of portfolio based on real data"""
    try:
        user_id = int(user["id"])
        storage = get_watchlist_collection()
        
        # Get watchlist from Database
        stocks = await storage.get_watchlist(user_id)
        
        if not stocks:
            return {"summary": "Your portfolio is empty. Start tracking stocks to get insights."}
        
        # Analyze portfolio characteristics with real data
        sectors = {}
        market_caps = {"Large-cap": 0, "Mid-cap": 0, "Small-cap": 0}
        total = len(stocks)
        pe_ratios = []
        debt_ratios = []
        stock_changes = []
        
        for stock in stocks[:20]:  # Limit for performance
            symbol = stock["symbol"].split('.')[0]
            exchange = stock.get("exchange", "NSE")
            try:
                # Get quote data
                quote = await get_stock_quote_angel_async(symbol, exchange)
                if quote:
                    ltp = quote.get("ltp", 0)
                    change_pct = quote.get("changePercent", 0)
                    stock_changes.append(change_pct)
                    
                    # Get sector
                    sector = estimate_sector(symbol)
                    sectors[sector] = sectors.get(sector, 0) + 1
                    
                    # Get market cap type
                    cap_type = estimate_market_cap(symbol, ltp)
                    market_caps[cap_type] = market_caps.get(cap_type, 0) + 1
                
                # Get fundamentals for deeper analysis
                try:
                    fundamentals = await get_stock_fundamentals(symbol)
                    if fundamentals:
                        if fundamentals.get("pe_ratio"):
                            pe_ratios.append(fundamentals["pe_ratio"])
                        # Debt-to-equity might not be available for all stocks
                except:
                    pass
            except Exception as e:
                print(f"[AI SUMMARY] Error processing {symbol}: {e}")
                continue
        
        # Generate intelligent summary
        top_sector = max(sectors, key=sectors.get) if sectors else "diversified"
        sector_pct = round((sectors.get(top_sector, 0) / total) * 100, 0) if sectors else 0
        
        # Determine concentration risk
        if sector_pct > 50:
            concentration = "highly concentrated"
        elif sector_pct > 35:
            concentration = "moderately concentrated"
        else:
            concentration = "well diversified"
        
        # Calculate portfolio performance
        avg_change = sum(stock_changes) / len(stock_changes) if stock_changes else 0
        
        # Build intelligent summary
        summary = f"Your portfolio tracks {total} stocks, {concentration}"
        
        if top_sector != "diversified" and sector_pct > 25:
            summary += f" with {int(sector_pct)}% in {top_sector} sector. "
        else:
            summary += f" across multiple sectors. "
        
        # Add performance insight
        if avg_change > 2:
            summary += f"Portfolio showing strong momentum with avg +{avg_change:.1f}% gain. "
        elif avg_change < -2:
            summary += f"Portfolio under pressure with avg {avg_change:.1f}% decline. "
        elif abs(avg_change) <= 0.5:
            summary += "Market conditions are stable. "
        
        # Add valuation insight
        if pe_ratios and len(pe_ratios) > 3:
            avg_pe = sum(pe_ratios) / len(pe_ratios)
            if avg_pe < 15:
                summary += "Value-oriented holdings with low PE ratios."
            elif avg_pe > 30:
                summary += "Growth-focused with premium valuations."
            else:
                summary += "Balanced valuation profile."
        
        # Add market cap distribution
        large_cap_pct = (market_caps["Large-cap"] / total) * 100 if total > 0 else 0
        if large_cap_pct > 70:
            summary += " Predominantly large-cap focused for stability."
        elif large_cap_pct < 30:
            summary += " Exposure to mid/small caps for growth potential."
        
        return {"summary": summary.strip(), "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        print(f"[AI SUMMARY ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {"summary": "Portfolio analysis in progress. Your holdings are being evaluated for insights."}


@router.post("/notes/{symbol}")
async def update_stock_notes(symbol: str, notes: StockNote, user: dict = Depends(get_current_user)):
    """Update notes/thesis for a stock"""
    try:
        user_id = user["id"]
        collection = get_watchlist_collection()
        
        result = await collection.update_one(
            {"user_id": user_id, "symbol": symbol},
            {"$set": {"notes": notes.dict()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Stock not found in portfolio")
        
        return {"message": "Notes updated successfully"}
    except Exception as e:
        print(f"[NOTES UPDATE ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def estimate_sector(symbol: str) -> str:
    """Estimate sector based on symbol"""
    # Clean symbol - remove exchange suffixes like -EQ, -BE, .NSE, .BSE
    clean_symbol = symbol.upper().split('.')[0].split('-')[0]
    
    # Comprehensive sector mapping
    sector_mapping = {
        # IT
        "TCS": "IT", "INFY": "IT", "WIPRO": "IT", "HCLTECH": "IT", "TECHM": "IT",
        "LTI": "IT", "COFORGE": "IT", "MINDTREE": "IT", "MPHASIS": "IT",
        "LTTS": "IT", "PERSISTENT": "IT", "KPIT": "IT",
        
        # Banking & Finance
        "HDFCBANK": "Banking", "ICICIBANK": "Banking", "SBIN": "Banking", 
        "KOTAKBANK": "Banking", "AXISBANK": "Banking", "INDUSINDBK": "Banking",
        "BANDHANBNK": "Banking", "FEDERALBNK": "Banking", "IDFCFIRSTB": "Banking",
        "BAJFINANCE": "Finance", "BAJAJFINSV": "Finance", "CHOLAFIN": "Finance",
        "SHRIRAMFIN": "Finance", "SBICARD": "Finance", "HDFCLIFE": "Finance",
        "SBILIFE": "Finance", "ICICIGI": "Finance", "BAJAJFINANCE": "Finance",
        
        # Pharma
        "SUNPHARMA": "Pharma", "DRREDDY": "Pharma", "CIPLA": "Pharma", 
        "DIVISLAB": "Pharma", "BIOCON": "Pharma", "AUROPHARMA": "Pharma",
        "LUPIN": "Pharma", "TORNTPHARM": "Pharma", "ALKEM": "Pharma",
        "LALPATHLAB": "Pharma", "METROPOLIS": "Pharma",
        
        # Auto
        "MARUTI": "Auto", "TATAMOTORS": "Auto", "M&M": "Auto", 
        "BAJAJ": "Auto", "HEROMOTOCO": "Auto", "EICHERMOT": "Auto",
        "ASHOKLEY": "Auto", "TVSMOTOR": "Auto", "ESCORTS": "Auto",
        "MOTHERSON": "Auto", "BALKRISIND": "Auto",
        
        # FMCG
        "HINDUNILVR": "FMCG", "ITC": "FMCG", "NESTLEIND": "FMCG", 
        "BRITANNIA": "FMCG", "DABUR": "FMCG", "MARICO": "FMCG",
        "GODREJCP": "FMCG", "COLPAL": "FMCG", "TATACONSUM": "FMCG",
        "EMAMILTD": "FMCG", "VARUN": "FMCG",
        
        # Energy & Power
        "RELIANCE": "Energy", "ONGC": "Energy", "BPCL": "Energy", 
        "IOC": "Energy", "GAIL": "Energy", "NTPC": "Power",
        "POWERGRID": "Power", "ADANIGREEN": "Power", "TATAPOWER": "Power",
        "ADANIPOWER": "Power", "ADANIENT": "Energy",
        
        # Metals
        "TATASTEEL": "Metals", "JSWSTEEL": "Metals", "HINDALCO": "Metals",
        "VEDL": "Metals", "COALINDIA": "Metals", "NATIONALUM": "Metals",
        "SAIL": "Metals", "NMDC": "Metals",
        
        # Cement
        "ULTRACEMCO": "Cement", "GRASIM": "Cement", "SHREECEM": "Cement",
        "ACC": "Cement", "AMBUJACEMENT": "Cement", "DALMIACEM": "Cement",
        
        # Infrastructure
        "LT": "Infrastructure", "ADANIPORTS": "Infrastructure", 
        "CONCOR": "Infrastructure", "IRB": "Infrastructure",
        
        # Retail
        "DMART": "Retail", "TRENT": "Retail", "JUBLFOOD": "Retail",
        "AVENUE": "Retail",
        
        # Telecom
        "BHARTIARTL": "Telecom", "IDEA": "Telecom",
        
        # Realty
        "DLF": "Realty", "GODREJPROP": "Realty", "OBEROIRLTY": "Realty",
        "PHOENIXLTD": "Realty",
        
        # Consumer Durables
        "TITAN": "Consumer", "ASIANPAINT": "Consumer", "PIDILITIND": "Consumer",
        "VOLTAS": "Consumer", "HAVELLS": "Consumer", "CROMPTON": "Consumer",
    }
    
    return sector_mapping.get(clean_symbol, "Other")

def estimate_market_cap(symbol: str, ltp: float = 0) -> str:
    """Estimate market cap category based on symbol and price"""
    # Clean symbol - remove exchange suffixes
    clean_symbol = symbol.upper().split('.')[0].split('-')[0]
    
    # Large cap stocks (typically top 100 by market cap)
    large_cap = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", 
        "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
        "MARUTI", "SUNPHARMA", "BAJFINANCE", "BAJAJFINANCE", "TITAN", "ULTRACEMCO",
        "NESTLEIND", "ASIANPAINT", "HCLTECH", "WIPRO", "ADANIPORTS",
        "ONGC", "NTPC", "POWERGRID", "TATASTEEL", "M&M", "TECHM",
        "BAJAJFINSV", "GRASIM", "DRREDDY", "BRITANNIA", "CIPLA"
    ]
    
    # Mid cap stocks
    mid_cap = [
        "DIVISLAB", "INDUSINDBK", "BANDHANBNK", "BIOCON", "LUPIN",
        "GODREJCP", "MARICO", "DABUR", "TATACONSUM", "COLPAL",
        "TVSMOTOR", "ESCORTS", "ASHOKLEY", "EICHERMOT", "TORNTPHARM",
        "AUROPHARMA", "ALKEM", "DMART", "TRENT", "JUBLFOOD",
        "CHOLAFIN", "SBICARD", "SHRIRAMFIN", "MPHASIS", "COFORGE"
    ]
    
    if clean_symbol in large_cap:
        return "Large-cap"
    elif clean_symbol in mid_cap:
        return "Mid-cap"
    else:
        return "Small-cap"

def calculate_risk_level(total_stocks: int, sectors: dict, market_caps: dict) -> str:
    """Calculate portfolio risk level based on diversification"""
    if total_stocks == 0:
        return "N/A"
    
    if total_stocks < 5:
        return "High"
    
    # Check sector concentration
    max_sector_count = max(sectors.values()) if sectors else 0
    max_sector_pct = (max_sector_count / total_stocks) if total_stocks > 0 else 0
    
    # Check small cap concentration
    small_cap_count = market_caps.get("Small-cap", 0)
    small_cap_pct = (small_cap_count / total_stocks) if total_stocks > 0 else 0
    
    if max_sector_pct > 0.6 or small_cap_pct > 0.5:
        return "High"
    elif max_sector_pct > 0.4 or small_cap_pct > 0.3:
        return "Medium"
    else:
        return "Low"

def calculate_concentration(stocks: list, top_n: int) -> float:
    """Calculate top N concentration percentage"""
    if not stocks or len(stocks) < top_n:
        return round((len(stocks) / max(top_n, 1)) * 100, 1) if stocks else 0.0
    return round((top_n / len(stocks)) * 100, 1)

async def get_stock_fundamentals_data(symbol: str, exchange: str = "NSE") -> dict:
    """Get comprehensive stock data including fundamentals"""
    result = {
        "quote": None,
        "fundamentals": None,
        "pe_ratio": None,
        "debt_equity": None,
        "roe": None,
        "revenue_growth": None
    }
    
    try:
        # Get real-time quote
        quote = await get_stock_quote_angel_async(symbol, exchange)
        result["quote"] = quote
        
        # Get fundamentals from Yahoo Finance
        try:
            yahoo_symbol = f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO"
            fundamentals = await get_stock_fundamentals(yahoo_symbol)
            if fundamentals:
                result["fundamentals"] = fundamentals
                result["pe_ratio"] = fundamentals.get("pe_ratio")
                result["debt_equity"] = fundamentals.get("debt_to_equity")
                result["roe"] = fundamentals.get("return_on_equity")
                result["revenue_growth"] = fundamentals.get("revenue_growth")
        except Exception as e:
            print(f"[PORTFOLIO] Yahoo fundamentals failed for {symbol}: {e}")
    except Exception as e:
        print(f"[PORTFOLIO] Error fetching data for {symbol}: {e}")
    
    return result

def validate_screener_conditions(symbol: str, stock_data: dict) -> str:
    """Validate if stock still meets common screener conditions"""
    try:
        quote = stock_data.get("quote", {})
        if not quote:
            return "not_matched"
        
        ltp = quote.get("ltp", 0)
        if ltp <= 0:
            return "not_matched"
        
        # Get fundamentals
        pe_ratio = stock_data.get("pe_ratio")
        debt_equity = stock_data.get("debt_equity")
        roe = stock_data.get("roe")
        
        matched_count = 0
        total_conditions = 0
        
        # Common screener conditions
        if pe_ratio is not None:
            total_conditions += 1
            if 0 < pe_ratio < 30:
                matched_count += 1
        
        if debt_equity is not None:
            total_conditions += 1
            if debt_equity < 1.5:
                matched_count += 1
        
        if roe is not None:
            total_conditions += 1
            if roe > 10:
                matched_count += 1
        
        # If no fundamental data available, check price movement
        if total_conditions == 0:
            prev_close = quote.get("close", 0)
            if prev_close > 0:
                change_pct = ((ltp - prev_close) / prev_close) * 100
                # If price hasn't crashed, consider partially matched
                if change_pct > -10:
                    return "partially_matched"
            return "not_matched"
        
        # Calculate match percentage
        match_pct = (matched_count / total_conditions) if total_conditions > 0 else 0
        
        if match_pct >= 0.8:
            return "fully_matched"
        elif match_pct >= 0.4:
            return "partially_matched"
        else:
            return "not_matched"
    except Exception as e:
        print(f"[SCREENER VALIDATION ERROR] {symbol}: {e}")
        return "not_matched"

def calculate_trend(change_pct: float) -> str:
    """Calculate trend based on price change"""
    if change_pct > 1:
        return "up"
    elif change_pct < -1:
        return "down"
    else:
        return "sideways"

def analyze_factor_bias(stocks_data: list) -> dict:
    """Analyze factor bias in portfolio based on actual data"""
    if not stocks_data:
        return {
            "value_vs_growth": "Insufficient Data",
            "debt_profile": "Insufficient Data",
            "earnings_momentum": "Insufficient Data"
        }
    
    pe_ratios = []
    debt_ratios = []
    roe_values = []
    
    for stock in stocks_data:
        if stock.get("pe_ratio") and stock["pe_ratio"] > 0:
            pe_ratios.append(stock["pe_ratio"])
        if stock.get("debt_equity") is not None:
            debt_ratios.append(stock["debt_equity"])
        if stock.get("roe") and stock["roe"] > 0:
            roe_values.append(stock["roe"])
    
    # Value vs Growth analysis
    avg_pe = sum(pe_ratios) / len(pe_ratios) if pe_ratios else None
    if avg_pe:
        if avg_pe < 15:
            value_growth = "Value Oriented"
        elif avg_pe > 25:
            value_growth = "Growth Oriented"
        else:
            value_growth = "Balanced"
    else:
        value_growth = "Mixed/Unknown"
    
    # Debt profile analysis
    avg_debt = sum(debt_ratios) / len(debt_ratios) if debt_ratios else None
    if avg_debt is not None:
        if avg_debt < 0.5:
            debt_profile = "Low Debt"
        elif avg_debt < 1.0:
            debt_profile = "Moderate Debt"
        else:
            debt_profile = "High Debt"
    else:
        debt_profile = "Unknown"
    
    # Earnings quality
    avg_roe = sum(roe_values) / len(roe_values) if roe_values else None
    if avg_roe:
        if avg_roe > 20:
            earnings = "Strong Profitability"
        elif avg_roe > 12:
            earnings = "Stable Profitability"
        else:
            earnings = "Weak Profitability"
    else:
        earnings = "Unknown"
    
    return {
        "value_vs_growth": value_growth,
        "debt_profile": debt_profile,
        "earnings_momentum": earnings
    }

async def generate_screener_conditions(symbol: str, stock_data: dict) -> List[dict]:
    """Generate actual screener conditions based on real data"""
    conditions = []
    
    quote = stock_data.get("quote", {})
    pe_ratio = stock_data.get("pe_ratio")
    debt_equity = stock_data.get("debt_equity")
    roe = stock_data.get("roe")
    revenue_growth = stock_data.get("revenue_growth")
    
    # PE Ratio condition
    if pe_ratio is not None and pe_ratio > 0:
        status = "matched" if pe_ratio < 30 else "broken"
        conditions.append({
            "name": "PE Ratio < 30",
            "status": status,
            "current_value": f"{pe_ratio:.2f}",
            "threshold": "< 30"
        })
    
    # Debt/Equity condition
    if debt_equity is not None:
        status = "matched" if debt_equity < 1.5 else "broken"
        conditions.append({
            "name": "Debt/Equity < 1.5",
            "status": status,
            "current_value": f"{debt_equity:.2f}",
            "threshold": "< 1.5"
        })
    
    # ROE condition
    if roe is not None:
        status = "matched" if roe > 10 else "broken"
        conditions.append({
            "name": "ROE > 10%",
            "status": status,
            "current_value": f"{roe:.1f}%",
            "threshold": "> 10%"
        })
    
    # Revenue Growth
    if revenue_growth is not None:
        status = "matched" if revenue_growth > 5 else "broken"
        conditions.append({
            "name": "Revenue Growth > 5%",
            "status": status,
            "current_value": f"{revenue_growth:.1f}%",
            "threshold": "> 5%"
        })
    
    # Price momentum (from quote)
    if quote:
        ltp = quote.get("ltp", 0)
        prev_close = quote.get("close", 0)
        if ltp > 0 and prev_close > 0:
            change_pct = ((ltp - prev_close) / prev_close) * 100
            status = "matched" if change_pct > -5 else "broken"
            conditions.append({
                "name": "Not in severe decline",
                "status": status,
                "current_value": f"{change_pct:.2f}%",
                "threshold": "> -5%"
            })
    
    return conditions if conditions else [
        {"name": "No data available", "status": "unknown", "current_value": "N/A", "threshold": "N/A"}
    ]

async def generate_advisory_signals(symbol: str, stock_data: dict) -> List[dict]:
    """Generate advisory signals based on actual stock data"""
    signals = []
    
    quote = stock_data.get("quote", {})
    if not quote:
        return signals
    
    ltp = quote.get("ltp", 0)
    prev_close = quote.get("close", 0)
    pe_ratio = stock_data.get("pe_ratio")
    debt_equity = stock_data.get("debt_equity")
    roe = stock_data.get("roe")
    
    # Price decline signal
    if ltp > 0 and prev_close > 0:
        change_pct = ((ltp - prev_close) / prev_close) * 100
        if change_pct < -5:
            signals.append({
                "symbol": symbol,
                "type": "price_movement",
                "message": f"{symbol} declined {abs(change_pct):.1f}% today",
                "severity": "warning",
                "timestamp": datetime.utcnow().isoformat()
            })
    
    # High PE signal
    if pe_ratio and pe_ratio > 40:
        signals.append({
            "symbol": symbol,
            "type": "valuation",
            "message": f"{symbol} PE ratio at {pe_ratio:.1f}, above typical threshold",
            "severity": "info",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # High debt signal
    if debt_equity and debt_equity > 2:
        signals.append({
            "symbol": symbol,
            "type": "fundamental_change",
            "message": f"{symbol} debt-to-equity ratio at {debt_equity:.2f}, monitoring recommended",
            "severity": "warning",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # Low ROE signal
    if roe is not None and roe < 8:
        signals.append({
            "symbol": symbol,
            "type": "profitability",
            "message": f"{symbol} ROE at {roe:.1f}%, below typical threshold",
            "severity": "info",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return signals
