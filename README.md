
AI-Powered Mobile Stock Screener & Advisory Platform 

Developer: Rishitha Sandiri

An intelligent stock screening and advisory platform built with Streamlit (frontend) and Flask APIs (backend).
This platform provides real-time stock market updates, portfolio & watchlist management,AI-driven advisory, and semantic searchusing FAISS and Gemini LLM.

Features:
Core Functionality

* Portfolio Management: Track and manage your holdings in real-time
* Watchlist Management : Add or remove stocks; receive notifications for changes
* Live Market Updates : Real-time NSE/BSE stock prices using APIs
* AI-Powered Advisory: Ask natural language queries about stocks using Gemini LLM
* Notifications : Alerts when a stock is added or removed from watchlist/portfolio

 Technical Features

* Semantic Search with FAISS: Search stocks and related info quickly
* Interactive Dashboard (Streamlit): Real-time charts, tables, and notifications
* Flask APIs (Backend): Handle data retrieval, AI processing, and notifications
* PostgreSQL Database: Stores stock data, portfolio, watchlist, and notifications
* Vector Embeddings: For semantic search and AI queries

---

Backend (Flask APIs) 

Prerequisites

* Python 3.8+
* PostgreSQL 12+
* Git

Dependencies

* `requirements.txt` (Python libraries)
* FAISS (vector search)
* Gemini AI API Key
* PostgreSQL database

Installation

```bash
# Create virtual environment
python -m venv faissenv
faissenv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

Database Setup

```sql
CREATE DATABASE stock_screener_db;
```

Update backend config (`config.py`) with your database credentials:

```python
DATABASE_URL = "postgresql://username:password@localhost:5432/stock_screener_db"
```

Run Backend

```bash
cd backend
python run.py
python faiss_api.py

```

---

Frontend (Streamlit)

Prerequisites

* Python 3.8+
* Git

Installation

```bash
cd frontend
python -m venv streamlitenv
streamlitenv\Scripts\activate
pip install -r requirements.txt
```

Run Frontend

```bash
cd frontend
streamlit run app.py
```
Dashboard Tabs & Functionality

1. **Portfolio:** Monitor your current holdings, profits/losses, and performance.
2. **Watchlist:** Track selected stocks and receive alerts on changes.
3. **Live Market:** View real-time prices and trends of NSE/BSE stocks.
4. **LLM / AI Chat:** Ask natural language queries about stocks and portfolios.
5. **Notifications:** Alerts triggered when stocks are added or removed from portfolio/watchlist.


Constraints & Limitations

Technical Constraints:
Python Version: Requires Python 3.8+ (uses modern type hints and async features)
Database: PostgreSQL required (uses specific PostgreSQL features)
Memory: Vector embeddings require sufficient RAM for large datasets
API Limits: Subject to yahoo finance rate limits and Google AI quotas

Data Constraints:
Market Data: Currently optimized for NSE stocks
Historical Data: CSV format must match expected schema
Real-time Updates: Market data updates depend on API availability

Security Constraints:
Environment Variables: All sensitive keys must be in .env file
CORS: Frontend must run on configured origin 
JWT Tokens: Implement token refresh for production use

Performance Constraints:
Query Processing: AI parsing may have latency for complex queries
Data Processing: Large CSV files may require significant processing time
Concurrent Users: Database connection pooling needed for high traffic


Folder Structure 

```
AI-Powered-Mobile-Stock-Screener-and-Advisory-Platform/
│
├── backend/
│   ├── Backend/       # Python scripts and Flask APIs
│   ├── requirements.txt
│
├── frontend/
│   ├── Frontend/      # Streamlit dashboard
│   ├── requirements.txt
│
├── README.md
├── .gitignore
└── data/              # CSV uploads, cache, vector index
```

---

Environment Variables 

Create a `.env` in backend root:

```
GEMINI_API_KEY=your_gemini_api_key
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=stock_screener_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

---

## **Usage Examples**

### **Notifications**

* Receive alerts when a stock is **added or removed** from watchlist or portfolio.

### **AI Queries**

* Example queries for LLM chat:

```
"Show me top performing tech stocks"
"Which stocks have high volume today?"
"Find stocks below ₹500"

Testing & Development

Run tests:

```bash
python -m pytest tests/
```

Lint code:

```bash
flake8 backend/ frontend/
```

---

Contributing

1. Fork the repository
2. Create a feature branch:

```bash
git checkout -b feature/new-feature
```

3. Commit changes:

```bash
git commit -am "Add new feature"
```

4. Push to branch:

```bash
git push origin feature/new-feature
```

5. Create a Pull Request

---

License

Proprietary software. All rights reserved.

---

Support

* Review README setup instructions
* Contact developer: Rishitha Sandiri
* Verify data before making financial decisions

 


Note: This application is for educational and research purposes. Always verify data accuracy and consult financial professionals before making investment decisions.



