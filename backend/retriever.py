import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import PGVector
# Instead of: from langchain.chains import RetrievalQA
from langchain_classic.chains import RetrievalQA

from langchain_core.prompts import PromptTemplate

# 1. Configuration
# Replace with your actual Gemini API Key
os.environ["GOOGLE_API_KEY"] = "AIzaSyCR0IfwZx382bw6Cvhgrahu0aD1Doat3i8"

CONNECTION_STRING = "postgresql://postgres:Admin@localhost:5432/stockdb"
COLLECTION_NAME = "stock_full_analysis_hf2"

def query_stock_assistant(user_question):
    try:
        # --- STEP 1: LOAD THE VECTOR STORE ---
        # We must use the SAME embedding model used during the storage phase
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        vector_db = PGVector(
            connection_string=CONNECTION_STRING,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings
        )

        # --- STEP 2: INITIALIZE GEMINI LLM ---
        # You can use "gemini-1.5-flash" (fast) or "gemini-1.5-pro" (powerful)
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.0)

        # --- STEP 3: CREATE A CUSTOM PROMPT ---
        # This tells Gemini how to behave
        template = """
           ### Role: Expert Stock Data Analyst (Nifty 50)
        You are an expert analyst for the Nifty 50 index. Your dataset contains 50 specific companies (including **HDFCBANK.NS**, **AXISBANK.NS**, **RELIANCE.NS**, etc.).

        ### Instructions:
        1. **Multi-Entity Handling (CRITICAL)**: If the user question mentions two or more companies (e.g., "HDFC vs Axis"), you MUST provide data for **EVERY** company mentioned. 
        - Do not summarize just one. 
        - If the retrieved context is missing data for one of the requested companies, explicitly state: *"Context for [Company Name] was not found, providing general market overview for them instead."*
        2. **Context Prioritization & Fallback**: 
        - Use the **Provided Context** for specific numbers (Open, Close, PE).
        - If the context is empty or missing a company that is part of the Nifty 50, use your internal knowledge to provide the answer so the user is never left without a response but never says i use my internal knowledge.
        3. **Temporal Analysis**: For year-based queries (e.g., "2021 PE ratios"), summarize the **Mean**, **Max**, and **Min** values for that year from the context.
        1. **Context Prioritization**: Always look at the **Provided Context** first. It contains precise historical data from your vector database.
        2. **Fallback Knowledge**: If the **Provided Context** does not contain specific rows for the user's query (e.g., retrieval fails or is empty), use your internal knowledge about the Nifty 50 companies to answer the question. In this case, start your response by saying: *"Based on available Nifty 50 data trends..."*
        3. **Temporal Summarization**: When a user asks for metrics by year (e.g., "PE ratio in 2021"), do not list every day. Calculate or identify the **Average**, **High**, and **Low** for that year based on the context.
        4. **Company Comparison**: If asked to compare 2 or more companies, generate a **Markdown Table** comparing key metrics like **Market Cap**, **PE Ratio**, **Total Debt**, and **Sector**.
        5. **Handling Typos**: Automatically correct company names (e.g., "TCS" for "Tata Consultancy Services", "Relience" for "Reliance Industries").
        

        ### Guidelines:
        - Use **Bold** for Symbols and Metrics.
        - If data for a specific attribute (like `peg_ratio`) is missing/null, state it clearly.
        - Never provide a partial answer if multiple entities are involved.

        ### Provided Context:
        {context}

        ### User Question:
        {question}

        ### Answer:
        """
        
        QA_CHAIN_PROMPT = PromptTemplate.from_template(template)

        # --- STEP 4: SETUP THE RETRIEVAL CHAIN ---
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_db.as_retriever(search_kwargs={"k": 35}), # Fetches top 5 relevant stocks
            chain_type_kwargs={"prompt": QA_CHAIN_PROMPT}
        )

        # --- STEP 5: RUN THE QUERY ---
        print(f"\nAnalysing: {user_question}...")
        response = qa_chain.invoke({"query": user_question})

        
        return response["result"]

    except Exception as e:
        return f"❌ Error: {e}"

if __name__ == "__main__":
    # Example Questions you can ask:
    # 1. "Which companies have a PEG ratio below 1 and high promoter holding?"
    # 2. "Summarize the financial health of the Technology sector based on the data."
    # 3. "Compare 20MICRONS.NS and 3MINDIA.NS."
    
    question = "Show me Infosys stock data including PE ratio, market cap, and sector."
    answer = query_stock_assistant(question)
    
    print("\n--- Gemini Analyst Response ---")
    print(answer)