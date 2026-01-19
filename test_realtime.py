"""Test script for real-time stock service"""
import sys
sys.path.insert(0, '.')

try:
    from services.stock_service import get_quote, get_company
    print("Import successful!")
    
    print("\nTesting get_quote('RELIANCE')...")
    quote = get_quote('RELIANCE')
    print(f"Quote: {quote}")
    
    print("\nTesting get_company('TCS')...")
    company = get_company('TCS')
    if company:
        print(f"Symbol: {company.get('symbol')}")
        print(f"Close: {company.get('close')}")
        print(f"EPS: {company.get('eps')}")
        print(f"PE Ratio: {company.get('pe_ratio')}")
        print(f"Data Source: {company.get('data_source')}")
    else:
        print("No company data returned")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
