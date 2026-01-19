# AI Stock Screener 📈

**Developer:** Kaivalya Agarkar  

An intelligent stock screening and analytics platform built using **Flask (backend)** and **HTML, CSS, JavaScript (frontend)**.  
This project enables users to analyze Indian stocks, perform AI-based searches using vector embeddings, track prices, manage watchlists, and visualize market trends through an interactive dashboard.

---

## 💡 Features

### 🔍 Core Functionality
- Natural language stock search
- Live Indian stock price fetching
- Stock analytics dashboard
- Individual stock analytics page
- Watchlist and portfolio management
- Price alerts and notifications
- CSV-based stock data analysis

### 🤖 AI & Intelligence
- Semantic stock search using vector embeddings
- Intelligent stock matching
- Embedding-based similarity search (FAISS)

### 📊 Data Visualization
- Interactive price charts
- 1 Month / 6 Month / 1 Year trends
- RSI indicator
- Volume analysis
- Dark mode support

---

## 🧠 Tech Stack

### Backend
- Python
- Flask
- Pandas
- Yahoo Finance API
- Vector Embeddings (FAISS)
- JSON & CSV storage

### Frontend
- HTML
- CSS
- JavaScript
- Chart.js

---

## ⚙️ Backend (Flask)

### Prerequisites 📋
- Python 3.8+
- Git

### Backend Dependencies 🔑
- Flask
- Pandas
- NumPy
- yfinance
- FAISS
- requests

Install dependencies:
```bash
pip install -r requirements.txt

🚀 Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/your-username/ai-stock-assistant.git
cd ai-stock-assistant

2️⃣ Run Backend Server
python backend/app.py
Backend will run on:
http://127.0.0.1:5000

3️⃣ Run Frontend
Open the following file in browser (Live Server recommended):
frontend/dashboard.html

🧪 Usage Examples
Natural language queries:
"Show me stocks below ₹500"
"Alert me if TATASTEEL crosses ₹120"
"Find bullish stocks"
"Show IT sector stocks"

🗂 Project Structure 📁
AI-STOCK-ASSISTANT/
├── backend/
│   ├── app.py
│   ├── chat_engine.py
│   ├── semantic_search.py
│   ├── embeddings.py
│   ├── vector_store.py
│   ├── yahoo_finance.py
│   ├── db.py
│   ├── requirements.txt
│   ├── data/
│   │   ├── indian_stocks.csv
│   │   └── company_level_data.csv
│   └── docs/
│       └── market_news.txt
│
├── frontend/
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── dashboard.css
│   ├── stock.html
│   ├── stock.js
│   ├── chat.html
│   ├── login.html
│   ├── signup.html
│   └── style.css
│
├── sql/
│   ├── db.sql
│   ├── watchlist.sql
│   └── alerts.sql
│
├── requirements.txt
└── README.md

📡 API Endpoints
Stocks  
GET /api/stocks – Fetch stock list  
GET /api/history/<symbol> – Stock price history  

AI & Search  
POST /api/ai-query – AI-based stock query  
POST /api/semantic-search – Embedding-based search  

Alerts  
POST /api/alerts/create – Create price alert  
GET /api/alerts/check – Check triggered alerts  


⚠️ Constraints & Limitations
Technical Constraints  
- Depends on external market data APIs  
- Embedding generation requires sufficient memory  

Data Constraints  
- Optimized for Indian stock market  
- CSV files must follow expected format  

Security Constraints  
- Token-based authentication  
- Local storage used for session management  

🧪 Testing
Run test files manually:  
python backend/test_data.py  

🧹 Code Quality
- Modular Flask architecture  
- Clean separation of backend and frontend  
- Readable and maintainable code  

📜 License
This project is developed for educational and academic purposes only.  
Not intended for real-world trading or financial decisions.  

👨‍💻 Author
Kaivalya Agarkar  
Computer Engineering Student  
AI • Backend • Full-Stack Development  

⚠️ Disclaimer
This application is for learning and demonstration purposes only.  
Always verify stock data from official sources before making financial decisions.

