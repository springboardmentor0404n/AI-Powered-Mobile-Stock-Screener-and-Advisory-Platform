import pandas as pd
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from database import get_db
from sqlalchemy.orm import Session
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for the vector store
vector_store = None

def initialize_rag():
    """Initialize the RAG components"""
    global vector_store
    
    try:
        # Load the stock market data
        df = pd.read_csv("cleaned_nifty_500.csv")
        
        # Create text documents from the data
        documents = []
        for _, row in df.iterrows():
            doc = f"""
            Company: {row['company']}
            Industry: {row['industry']}
            Symbol: {row['symbol']}
            Category: {row['category']}
            Market Cap: {row['market_cap']}
            Current Value: {row['current_value']}
            52 Week High: {row['high_52week']}
            52 Week Low: {row['low_52week']}
            Book Value: {row['book_value']}
            Price to Earnings: {row['price_earnings']}
            Dividend Yield: {row['dividend_yield']}
            Return on Capital Employed: {row['roce']}
            Return on Equity: {row['roe']}
            Sales Growth (3 Years): {row['sales_growth_3yr']}%
            """
            documents.append(doc.strip())
        
        # Create embeddings
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Create metadata for each document to include industry BEFORE splitting
        metadatas = []
        for doc in documents:
            # Extract industry from the document content
            lines = doc.split('\n')
            industry = ""
            for line in lines:
                if line.strip().startswith("Industry:"):
                    industry = line.replace("Industry:", "").strip()
                    break
            metadatas.append({"industry": industry})
        
        # Split documents into chunks
        text_splitter = CharacterTextSplitter(
            separator="\n",
            chunk_size=500,
            chunk_overlap=50,
            length_function=len
        )
        texts = text_splitter.create_documents(documents)
        
        # Create matching metadata for the split texts
        split_metadatas = []
        for i, text in enumerate(texts):
            # Determine which original document this text chunk came from
            # by checking which original document contains this chunk's content
            original_idx = 0
            for j, orig_doc in enumerate(documents):
                if text.page_content in orig_doc:
                    original_idx = j
                    break
            split_metadatas.append(metadatas[original_idx])
        
        # Create vector store with metadata
        vector_store = Chroma.from_documents(
            documents=texts,
            embedding=embeddings,
            persist_directory="./chroma_db"
        )
        
        # Note: Currently not setting metadata during creation due to compatibility issues
        # The filtering approach will need to be adjusted to work without metadata filtering
        
        logger.info("RAG components initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing RAG components: {str(e)}")
        return False

def ask_question(question: str):
    """Answer a question using the RAG system"""
    global vector_store
    
    try:
        # Validate input
        if not question or not question.strip():
            return "Please provide a valid question."
        
        question_lower = question.lower().strip()
        
        # Load the dataframe directly to handle specific queries properly
        df = pd.read_csv("cleaned_nifty_500.csv")
        
        # Handle specific queries with direct dataframe operations
        if "it companies" in question_lower or "technology companies" in question_lower or "software companies" in question_lower:
            # Filter for IT companies
            it_companies = df[df['industry'].str.contains('IT|Technology|Software', case=False, na=False)]
            if not it_companies.empty:
                response = "Here are some IT companies from the stock market data:\n\n"
                # Limit to top 3 IT companies
                top_it = it_companies.head(3)
                for i, (_, row) in enumerate(top_it.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']}\n\n"
                return response
            else:
                return "I couldn't find specific IT companies in the data."
        
        elif "banking" in question_lower or "banks" in question_lower:
            # Filter for banking companies
            banking_companies = df[df['industry'].str.contains('BANK|Banking|FINANCIAL', case=False, na=False)]
            if not banking_companies.empty:
                response = "Here are some banking sector companies from the stock market data:\n\n"
                # Limit to top 3 banking companies
                top_banks = banking_companies.head(3)
                for i, (_, row) in enumerate(top_banks.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']}\n\n"
                return response
            else:
                return "I couldn't find specific banking companies in the data."
        
        elif "highest market value" in question_lower or "highest market cap" in question_lower:
            # Find companies with highest market cap
            sorted_by_market_cap = df.nlargest(5, 'market_cap')
            response = "Here are the stocks with the highest market capitalization:\n\n"
            for i, (_, row) in enumerate(sorted_by_market_cap.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Market Cap: {row['market_cap']} | Current Value: {row['current_value']}\n\n"
            return response
        
        elif "highest price" in question_lower or "most expensive" in question_lower:
            # Find companies with highest current value
            sorted_by_price = df.nlargest(5, 'current_value')
            response = "Here are the highest priced stocks in the data:\n\n"
            for i, (_, row) in enumerate(sorted_by_price.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
            return response
        
        elif "top 5" in question_lower:
            # For top 5 query, return diversified stocks
            top_5 = df.nlargest(5, 'market_cap')
            response = "Here are the top 5 stocks by market capitalization:\n\n"
            for i, (_, row) in enumerate(top_5.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Market Cap: {row['market_cap']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
            return response
        
        elif "highest stock price" in question_lower or "highest price" in question_lower or "high priced stocks" in question_lower or "most expensive" in question_lower:
            # Find companies with highest current value
            sorted_by_price = df.nlargest(5, 'current_value')
            response = "Here are the stocks with the highest current prices:\n\n"
            for i, (_, row) in enumerate(sorted_by_price.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Industry: {row['industry']} | Market Cap: {row['market_cap']}\n\n"
            return response
        
        elif "vs" in question_lower or "versus" in question_lower or "compare" in question_lower:
            # Handle comparison queries
            # Find both companies mentioned in the query
            companies_found = []
                    
            # Look for company names/symbols in the question
            for _, row in df.iterrows():
                company_lower = row['company'].lower()
                symbol_lower = row['symbol'].lower()
                        
                # Check if company or symbol is mentioned in the question
                if company_lower in question_lower or symbol_lower in question_lower:
                    companies_found.append(row)
                    if len(companies_found) >= 2:  # We found two companies to compare
                        break
                    
            # If we didn't find 2 companies, try to extract them from the question differently
            if len(companies_found) < 2:
                # Split the question by 'vs' or 'versus' to identify company names
                import re
                parts = re.split(r'\bvs\b|\bversus\b|\band\b', question_lower, flags=re.IGNORECASE)
                if len(parts) >= 2:
                    # Clean the parts to get company names
                    first_part = parts[0].strip().replace('compare', '').strip()
                    second_part = parts[1].strip().replace('compare', '').strip()
                            
                    # Look for companies that match these parts
                    for _, row in df.iterrows():
                        if (first_part in row['company'].lower() or first_part in row['symbol'].lower()) and row.to_dict() not in [c.to_dict() for c in companies_found]:
                            companies_found.append(row)
                            if len(companies_found) >= 2:
                                break
                            
                    for _, row in df.iterrows():
                        if (second_part in row['company'].lower() or second_part in row['symbol'].lower()) and row.to_dict() not in [c.to_dict() for c in companies_found]:
                            companies_found.append(row)
                            if len(companies_found) >= 2:
                                break
                    
            if len(companies_found) >= 2:
                response = f"Here's a comparison between {companies_found[0]['company']} and {companies_found[1]['company']}:\n\n"
                response += f"1. {companies_found[0]['company']} ({companies_found[0]['symbol']}):\n"
                response += f"   - Industry: {companies_found[0]['industry']}\n"
                response += f"   - Current Value: {companies_found[0]['current_value']}\n"
                response += f"   - Market Cap: {companies_found[0]['market_cap']}\n\n"
                        
                response += f"2. {companies_found[1]['company']} ({companies_found[1]['symbol']}):\n"
                response += f"   - Industry: {companies_found[1]['industry']}\n"
                response += f"   - Current Value: {companies_found[1]['current_value']}\n"
                response += f"   - Market Cap: {companies_found[1]['market_cap']}\n\n"
                        
                # Add some analysis
                if companies_found[0]['current_value'] > companies_found[1]['current_value']:
                    response += f"{companies_found[0]['company']} has a higher stock price than {companies_found[1]['company']}.\n"
                elif companies_found[0]['current_value'] < companies_found[1]['current_value']:
                    response += f"{companies_found[1]['company']} has a higher stock price than {companies_found[0]['company']}.\n"
                else:
                    response += f"Both companies have similar stock prices.\n"
                
                if companies_found[0]['market_cap'] > companies_found[1]['market_cap']:
                    response += f"{companies_found[0]['company']} has a larger market capitalization than {companies_found[1]['company']}.\n"
                elif companies_found[0]['market_cap'] < companies_found[1]['market_cap']:
                    response += f"{companies_found[1]['company']} has a larger market capitalization than {companies_found[0]['company']}.\n"
                else:
                    response += f"Both companies have similar market capitalizations.\n"
            
                return response
            else:
                return f"I couldn't find both companies mentioned in your comparison query '{question}'. Please mention two companies/symbols to compare."
        
        elif "loss" in question_lower or "in loss" in question_lower or "losing" in question_lower:
            # Identify stocks that might be in loss by looking for low-performing indicators
            # Since we don't have specific profit/loss data, we'll look for companies with low current values or other indicators
            # For now, we'll return companies with lower current values
            sorted_by_low_value = df.nsmallest(5, 'current_value')
            response = "Here are some stocks with lower current values (potential candidates that might be in loss):\n\n"
            for i, (_, row) in enumerate(sorted_by_low_value.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Industry: {row['industry']} | Market Cap: {row['market_cap']}\n\n"
            return response
        
        elif "average" in question_lower:
            # Calculate and return average stock information
            avg_current_value = df['current_value'].mean()
            avg_market_cap = df['market_cap'].mean()
            
            # Find stocks closest to the average values
            df['value_diff_from_avg'] = abs(df['current_value'] - avg_current_value)
            avg_stocks = df.nsmallest(5, 'value_diff_from_avg')
            
            response = f"Here are some stocks with average characteristics (average current value: {avg_current_value:.2f}):\n\n"
            for i, (_, row) in enumerate(avg_stocks.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Industry: {row['industry']} | Market Cap: {row['market_cap']}\n\n"
            return response
        
        elif "top " in question_lower and "by market capitalization" in question_lower:
            # Handle queries like "top 10 stocks by market capitalization"
            # Extract the number from the query
            import re
            numbers = re.findall(r'\d+', question_lower)
            num = int(numbers[0]) if numbers else 10  # Default to 10 if no number specified
            
            top_companies = df.nlargest(num, 'market_cap')
            response = f"Here are the top {num} stocks by market capitalization:\n\n"
            for i, (_, row) in enumerate(top_companies.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Market Cap: {row['market_cap']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
            return response
        
        elif "underperforming" in question_lower or "lowest" in question_lower and "price" in question_lower:
            # Handle queries like "Which stocks are underperforming?" or "Find stocks with lowest current prices"
            sorted_by_low_price = df.nsmallest(5, 'current_value')
            response = "Here are some potentially underperforming stocks (lowest current prices):\n\n"
            for i, (_, row) in enumerate(sorted_by_low_price.iterrows(), 1):
                response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Industry: {row['industry']} | Market Cap: {row['market_cap']}\n\n"
            return response
        
        elif "pe ratio" in question_lower or "pe" in question_lower and ("high" in question_lower or "highest" in question_lower):
            # Handle queries like "Find companies with highest PE ratios"
            # Remove rows with NaN PE ratios and sort
            pe_df = df[df['price_earnings'].notna()].nlargest(5, 'price_earnings')
            if not pe_df.empty:
                response = "Here are companies with the highest PE ratios:\n\n"
                for i, (_, row) in enumerate(pe_df.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | PE Ratio: {row['price_earnings']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
                return response
            else:
                return "PE ratio data is not available for the stocks in the dataset."
        
        elif "dividend yield" in question_lower or ("dividend" in question_lower and "high" in question_lower):
            # Handle queries like "Show stocks with highest dividend yields"
            dividend_df = df[df['dividend_yield'].notna()].nlargest(5, 'dividend_yield')
            if not dividend_df.empty:
                response = "Here are companies with the highest dividend yields:\n\n"
                for i, (_, row) in enumerate(dividend_df.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Dividend Yield: {row['dividend_yield']}% | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
                return response
            else:
                return "Dividend yield data is not available for the stocks in the dataset."
        
        elif "roe" in question_lower or "return on equity" in question_lower:
            # Handle queries like "Show stocks with high ROE"
            roe_df = df[df['roe'].notna()].nlargest(5, 'roe')
            if not roe_df.empty:
                response = "Here are companies with the highest Return on Equity (ROE):\n\n"
                for i, (_, row) in enumerate(roe_df.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | ROE: {row['roe']}% | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
                return response
            else:
                return "ROE data is not available for the stocks in the dataset."
        
        elif any(specific_stock in question_lower for specific_stock in ['reliance', 'tcs', 'infosys', 'hdfc', 'icici', 'sbin', 'hcl', 'wipro', 'tata', 'bajaj']):
            # Handle specific stock queries like "Tell me about Reliance Industries stock details"
            # Find the specific company mentioned in the query
            found_company = None
            for _, row in df.iterrows():
                if any(company_name in question_lower for company_name in [row['company'].lower(), row['symbol'].lower()] if isinstance(company_name, str)):
                    found_company = row
                    break
            
            if found_company is not None:
                response = f"Here's detailed information about {found_company['company']} ({found_company['symbol']}):\n\n"
                response += f"- Industry: {found_company['industry']}\n"
                response += f"- Current Value: {found_company['current_value']}\n"
                response += f"- Market Cap: {found_company['market_cap']}\n"
                response += f"- Category: {found_company['category']}\n"
                response += f"- 52 Week High: {found_company['high_52week']}\n"
                response += f"- 52 Week Low: {found_company['low_52week']}\n"
                response += f"- Price to Earnings: {found_company['price_earnings']}\n"
                response += f"- Dividend Yield: {found_company['dividend_yield']}\n"
                response += f"- Return on Equity: {found_company['roe']}\n"
                return response
            else:
                # If no exact match found, try partial matching
                matches = []
                for _, row in df.iterrows():
                    if question_lower.replace('tell me about', '').replace('details', '').strip() in row['company'].lower() or \
                       question_lower.replace('what is', '').replace('the', '').replace('current price', '').strip() in row['company'].lower() or \
                       question_lower.replace('show me', '').strip() in row['symbol'].lower():
                        matches.append(row)
                        if len(matches) >= 1:  # Just return the first match for specific stock queries
                            break
                
                if matches:
                    match = matches[0]
                    response = f"Here's information about {match['company']} ({match['symbol']}):\n\n"
                    response += f"- Industry: {match['industry']}\n"
                    response += f"- Current Value: {match['current_value']}\n"
                    response += f"- Market Cap: {match['market_cap']}\n"
                    response += f"- Category: {match['category']}\n\n"
                    return response
                else:
                    return f"I couldn't find specific information about that stock in the dataset. Try asking about major stocks like RELIANCE, TCS, INFY, HDFCBANK, etc."
        
        elif "medical" in question_lower or "healthcare" in question_lower or "hospital" in question_lower:
            # Filter for medical/healthcare companies
            medical_companies = df[df['industry'].str.contains('MEDICAL|HEALTHCARE|PHARMA|HOSPITAL|BIOTECHNOLOGY', case=False, na=False)]
            if not medical_companies.empty:
                response = "Here are some medical/healthcare sector stocks from the data:\n\n"
                # Limit to top results
                top_medical = medical_companies.head(5)
                for i, (_, row) in enumerate(top_medical.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']}\n\n"
                return response
            else:
                return "I couldn't find specific medical/healthcare companies in the data."
        
        elif "energy" in question_lower or "power" in question_lower:
            # Filter for energy companies
            energy_companies = df[df['industry'].str.contains('ENERGY|POWER|OIL|GAS|RENEWABLE|SOLAR|WIND', case=False, na=False)]
            if not energy_companies.empty:
                response = "Here are some energy sector stocks from the data:\n\n"
                # Limit to top results
                top_energy = energy_companies.head(5)
                for i, (_, row) in enumerate(top_energy.iterrows(), 1):
                    response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']}\n\n"
                return response
            else:
                return "I couldn't find specific energy companies in the data."
        
        elif "above" in question_lower and "market cap" in question_lower:
            # Handle queries like "Show IT companies with market cap above 50000"
            import re
            # Extract market cap threshold from the query
            numbers = re.findall(r'\d+', question_lower)
            threshold = int(numbers[0]) if numbers else 50000  # Default to 50000 if no number specified
            
            # Identify the industry from the query
            industry_keywords = ['it', 'banking', 'pharma', 'automotive', 'auto', 'energy', 'power', 'chemical', 'infrastructure', 'telecom', 'consumer']
            industry_pattern = None
            for keyword in industry_keywords:
                if keyword in question_lower:
                    if keyword == 'it':
                        industry_pattern = 'IT|Technology|Software'
                    elif keyword == 'banking':
                        industry_pattern = 'BANK|Banking|FINANCIAL'
                    elif keyword == 'pharma':
                        industry_pattern = 'MEDICAL|HEALTHCARE|PHARMA|BIOTECHNOLOGY'
                    elif keyword == 'automotive' or keyword == 'auto':
                        industry_pattern = 'AUTOMOBILE|AUTO'
                    elif keyword == 'energy' or keyword == 'power':
                        industry_pattern = 'ENERGY|POWER|OIL|GAS|RENEWABLE|SOLAR|WIND'
                    elif keyword == 'chemical':
                        industry_pattern = 'CHEMICALS'
                    elif keyword == 'infrastructure':
                        industry_pattern = 'INFRASTRUCTURE'
                    elif keyword == 'telecom':
                        industry_pattern = 'TELECOM'
                    elif keyword == 'consumer':
                        industry_pattern = 'CONSUMER GOODS'
                    break
            
            if industry_pattern:
                # Filter by industry and market cap threshold
                filtered_companies = df[(df['industry'].str.contains(industry_pattern, case=False, na=False)) & (df['market_cap'] > threshold)]
                if not filtered_companies.empty:
                    response = f"Here are {industry_pattern.split('|')[0].upper()} companies with market cap above {threshold}:\n\n"
                    for i, (_, row) in enumerate(filtered_companies.head(5).iterrows(), 1):
                        response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Market Cap: {row['market_cap']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
                    return response
                else:
                    return f"No {industry_pattern.split('|')[0].upper()} companies found with market cap above {threshold}."
            else:
                # If no specific industry found, just look for market cap
                high_market_cap = df[df['market_cap'] > threshold]
                if not high_market_cap.empty:
                    response = f"Here are companies with market cap above {threshold}:\n\n"
                    for i, (_, row) in enumerate(high_market_cap.head(5).iterrows(), 1):
                        response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Market Cap: {row['market_cap']} | Current Value: {row['current_value']} | Industry: {row['industry']}\n\n"
                    return response
                else:
                    return f"No companies found with market cap above {threshold}."
        
        elif "below" in question_lower and "price" in question_lower:
            # Handle queries like "Find banking stocks with current price below 1000"
            import re
            # Extract price threshold from the query
            numbers = re.findall(r'\d+', question_lower)
            threshold = int(numbers[0]) if numbers else 1000  # Default to 1000 if no number specified
            
            # Identify the industry from the query
            industry_keywords = ['it', 'banking', 'pharma', 'automotive', 'auto', 'energy', 'power', 'chemical', 'infrastructure', 'telecom', 'consumer']
            industry_pattern = None
            for keyword in industry_keywords:
                if keyword in question_lower:
                    if keyword == 'it':
                        industry_pattern = 'IT|Technology|Software'
                    elif keyword == 'banking':
                        industry_pattern = 'BANK|Banking|FINANCIAL'
                    elif keyword == 'pharma':
                        industry_pattern = 'MEDICAL|HEALTHCARE|PHARMA|BIOTECHNOLOGY'
                    elif keyword == 'automotive' or keyword == 'auto':
                        industry_pattern = 'AUTOMOBILE|AUTO'
                    elif keyword == 'energy' or keyword == 'power':
                        industry_pattern = 'ENERGY|POWER|OIL|GAS|RENEWABLE|SOLAR|WIND'
                    elif keyword == 'chemical':
                        industry_pattern = 'CHEMICALS'
                    elif keyword == 'infrastructure':
                        industry_pattern = 'INFRASTRUCTURE'
                    elif keyword == 'telecom':
                        industry_pattern = 'TELECOM'
                    elif keyword == 'consumer':
                        industry_pattern = 'CONSUMER GOODS'
                    break
            
            if industry_pattern:
                # Filter by industry and price threshold
                filtered_companies = df[(df['industry'].str.contains(industry_pattern, case=False, na=False)) & (df['current_value'] < threshold)]
                if not filtered_companies.empty:
                    response = f"Here are {industry_pattern.split('|')[0].upper()} companies with current price below {threshold}:\n\n"
                    for i, (_, row) in enumerate(filtered_companies.head(5).iterrows(), 1):
                        response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']} | Industry: {row['industry']}\n\n"
                    return response
                else:
                    return f"No {industry_pattern.split('|')[0].upper()} companies found with current price below {threshold}."
            else:
                # If no specific industry found, just look for price
                low_price = df[df['current_value'] < threshold]
                if not low_price.empty:
                    response = f"Here are companies with current price below {threshold}:\n\n"
                    for i, (_, row) in enumerate(low_price.head(5).iterrows(), 1):
                        response += f"{i}. Company: {row['company']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']} | Industry: {row['industry']}\n\n"
                    return response
                else:
                    return f"No companies found with current price below {threshold}."
        
        elif "related to" in question_lower or ("all " in question_lower and ("stocks" in question_lower or "stock" in question_lower)):        
            # Handle queries like "stocks related to medical sector" or "all energy stocks"
            # Extract the industry from the query
            industry_keywords = {
                'medical': 'MEDICAL|HEALTHCARE|PHARMA|HOSPITAL|BIOTECHNOLOGY',
                'healthcare': 'MEDICAL|HEALTHCARE|PHARMA|HOSPITAL|BIOTECHNOLOGY',
                'energy': 'ENERGY|POWER|OIL|GAS|RENEWABLE|SOLAR|WIND',
                'power': 'ENERGY|POWER|OIL|GAS|RENEWABLE|SOLAR|WIND',
                'banking': 'BANK|Banking|FINANCIAL',
                'finance': 'BANK|Banking|FINANCIAL',
                'it': 'IT|Technology|Software',
                'technology': 'IT|Technology|Software',
                'automotive': 'AUTOMOBILE|AUTO',
                'auto': 'AUTOMOBILE|AUTO',
                'pharma': 'MEDICAL|HEALTHCARE|PHARMA|BIOTECHNOLOGY',
                'chemical': 'CHEMICALS',
                'infrastructure': 'INFRASTRUCTURE',
                'telecom': 'TELECOM',
                'consumer': 'CONSUMER GOODS',
                'telecommunications': 'TELECOM',
                'renewable': 'RENEWABLE|SOLAR|WIND'
            }
            
            # Look for industry keywords in the question
            for keyword, industry_pattern in industry_keywords.items():
                if keyword in question_lower:
                    industry_companies = df[df['industry'].str.contains(industry_pattern, case=False, na=False)]
                    if not industry_companies.empty:
                        # Determine how many results to show based on the query
                        num_results = 5
                        if "7" in question_lower:
                            num_results = 7
                        elif "6" in question_lower:
                            num_results = 6
                        elif "4" in question_lower:
                            num_results = 4
                        elif "3" in question_lower:
                            num_results = 3
                        elif "2" in question_lower:
                            num_results = 2
                        
                        response = f"Here are {num_results} {keyword} sector stocks from the data:\n\n"
                        # Limit to specified number of results
                        top_industry = industry_companies.head(num_results)
                        for i, (_, row) in enumerate(top_industry.iterrows(), 1):
                            response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']}\n\n"
                        return response
            
            # If no specific industry found in the related_to branch, return to default handling
            # Fall through to the default else clause
            pass  # Continue to the else clause below
        
        else:
            # For general queries, use the vector store approach
            if vector_store is None:
                # Try to initialize if not already done
                if not initialize_rag():
                    return "Sorry, I'm having trouble accessing the data right now."
            
            # Use similarity search for general questions
            docs = vector_store.similarity_search(question, k=5)  # Get more results to have more variety
            
            # Remove duplicates while preserving order
            seen_content = set()
            unique_docs = []
            for doc in docs:
                # Create a content key based on company name to avoid duplicates
                lines = doc.page_content.strip().split('\n')
                company_name = ""
                for line in lines:
                    if line.startswith("Company:"):
                        company_name = line.replace("Company:", "").strip()
                        break
                
                if company_name and company_name not in seen_content:
                    seen_content.add(company_name)
                    unique_docs.append(doc)
            
            # Take only the first 3 unique documents
            unique_docs = unique_docs[:3]
            
            if unique_docs:
                response = f"Regarding your question '{question}', here's what I found in the stock market data:\n\n"
                
                for i, doc in enumerate(unique_docs, 1):
                    lines = doc.page_content.strip().split('\n')
                    # Filter to show only key information
                    key_info = []
                    for line in lines:
                        if any(field in line for field in ["Company:", "Industry:", "Symbol:", "Current Value:", "Market Cap:"]):
                            key_info.append(line.strip())
                    response += f"{i}. {' | '.join(key_info)}\n\n"
                
                return response
            else:
                # If similarity search doesn't return results, search in the dataframe directly
                # Look for exact matches in company names or symbols
                matches = []
                for _, row in df.iterrows():
                    if question_lower in row['company'].lower() or question_lower in row['symbol'].lower():
                        matches.append(row)
                        if len(matches) >= 3:
                            break
                
                if matches:
                    response = f"Here's what I found for '{question}' in the stock market data:\n\n"
                    for i, row in enumerate(matches, 1):
                        response += f"{i}. Company: {row['company']} | Industry: {row['industry']} | Symbol: {row['symbol']} | Current Value: {row['current_value']} | Market Cap: {row['market_cap']}\n\n"
                    return response
                else:
                    return f"I couldn't find specific information about '{question}' in the stock market data. You can ask about specific industries like IT companies, banking, pharma, etc., or about highest priced stocks."
        
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        return "Sorry, I couldn't process that question right now. Please try again later."

# Initialize RAG when the module is imported
if __name__ != "__main__":
    initialize_rag()