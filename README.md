# AI-Powered Stock Screener and Advisory Platform

A comprehensive full-stack application that combines real-time stock data, fundamental analysis, and AI-powered financial advisory through a Retrieval-Augmented Generation (RAG) system.

## 📋 Project Overview

This platform enables users to:
- **Browse & Filter** NIFTY50 companies with real-time stock metrics
- **Compare Investments** through interactive dashboards and visualizations
- **Ask Financial Questions** powered by LLM + vector embeddings
- **Build Watchlists** for personalized portfolio tracking
- **Analyze Fundamentals** using growth rates, P/E ratios, revenue, and more

---

## 🏗️ Architecture

### Backend (`/backend`)
**Framework:** Flask + Python  
**Key Technologies:**
- **Database:** PostgreSQL (user authentication & data)
- **RAG System:** LangChain + FAISS vectorstore + HuggingFace embeddings
- **LLM:** Groq (Llama 3.1 8B model)
- **Real-time Data:** Yahoo Finance API
- **Authentication:** JWT tokens

**Main Files:**
- `API_Gateway.py` - Flask routes for auth, dashboard insights, chat, and real-time stock data
- `build_vectorstore.py` - Creates FAISS vectorstore from CSV dataset
- `requirements.txt` - Python dependencies
- `data/NIFTY50_data.csv` - Fundamental stock data
- `vectorstore/index.faiss` - Pre-built FAISS embeddings

**Key Endpoints:**
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /companies` - List all companies
- `GET /dashboard/insights` - Market analysis & KPIs
- `POST /chat` - AI-powered financial Q&A

### Frontend (`/frontend`)
**Framework:** React 18 + Material-UI  
**Key Features:**
- Responsive dashboard with Chart.js visualizations
- Real-time company search with dropdown
- Company comparison charts (Revenue, P/E, Growth, Volume)
- AI chat interface for financial questions
- Watchlist management with localStorage persistence

**Main Components:**
- `Auth.jsx` - Login/Signup with JWT
- `Dashboard.jsx` - Stock analysis dashboard
- `Chat.jsx` - AI advisory chatbot
- `Watchlist.jsx` - User watchlist management

**Utilities:**
- `auth.js` - JWT token parsing & user extraction

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL 12+
- API Keys: Groq, HuggingFace (optional)

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with:
# DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
# SECRET_KEY, GROQ_API_KEY
# EXCEL_PATH (path to NIFTY50_data.csv)

# Build vectorstore
python build_vectorstore.py

# Start API server
python API_Gateway.py
# Runs on http://localhost:5001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
# Runs on http://localhost:3000
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  (React Dashboard + Chat Interface)                     │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Dashboard    Chat Query    Watchlist
     (GET)       (POST)        (localStorage)
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │   Flask API Gateway     │
        │   (Backend Server)      │
        └────────┬───────┬────────┘
                 │       │
        ┌────────▼─┐  ┌──▼────────┐
        │ PostgreSQL│  │Yahoo Finance
        │ (Users,   │  │(Real-time)
        │  Data)    │  │
        └───────────┘  └──────────┘
        
        ┌─────────────────────────────────┐
        │  RAG System                     │
        │  ├─ LangChain                   │
        │  ├─ FAISS Vectorstore           │
        │  ├─ HuggingFace Embeddings      │
        │  └─ Groq LLM (Chat)             │
        └─────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. **Stock Intelligence Dashboard**
- Real-time KPIs: Total Companies, Market Avg Growth, Market Avg P/E
- Interactive charts:
  - Growth Distribution (Pie)
  - P/E Ratio Analysis (Doughnut)
  - Revenue Comparison (Bar)
  - Volume Analysis (Bar)
  - Revenue Growth Trend (Line)
- Company search & filtering with dropdown
- Top 10 companies by revenue with trend indicators

### 2. **Company Comparison**
- Select a company to compare against market averages
- Side-by-side metric visualization
- Add to watchlist functionality

### 3. **AI Financial Advisory**
- Natural language Q&A about stocks
- Combines:
  - **Live Data:** Real-time stock metrics from Yahoo Finance
  - **Fundamentals:** Vector-based retrieval from dataset
  - **AI Analysis:** Groq LLM with financial context

### 4. **Watchlist Management**
- Persist favorite companies locally
- Quick removal & access
- Revenue display for tracking

### 5. **Authentication**
- Secure signup/login with JWT
- Password hashing with werkzeug
- 6-hour token expiration
- Protected API routes

---

## 📁 Project Structure

```
.
├── backend/
│   ├── API_Gateway.py              # Main Flask app
│   ├── build_vectorstore.py        # FAISS vectorstore builder
│   ├── requirements.txt            # Python dependencies
│   ├── dataset_symbols.txt         # Symbol reference
│   ├── .env                        # Environment variables
│   ├── data/
│   │   └── NIFTY50_data.csv       # Stock fundamental data
│   └── vectorstore/
│       └── index.faiss            # Pre-built embeddings
│
├── frontend/
│   ├── src/
│   │   ├── App.js                 # Main router
│   │   ├── index.js               # React entry point
│   │   ├── components/
│   │   │   ├── Auth.jsx           # Login/Signup
│   │   │   ├── Dashboard.jsx      # Main dashboard
│   │   │   ├── Chat.jsx           # AI chat
│   │   │   └── Watchlist.jsx      # Watchlist
│   │   ├── utils/
│   │   │   └── auth.js            # JWT utilities
│   │   └── [CSS files]
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── package.json
│   └── README.md
│
└── README.md                       # This file
```

---

## 🔧 Configuration

### Environment Variables (`.env`)

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_advisor

# Security
SECRET_KEY=your_secret_key_here

# APIs
GROQ_API_KEY=your_groq_api_key
EXCEL_PATH=./data/NIFTY50_data.csv
```

---

## 📊 Stock Metrics Available

The system tracks the following per-company metrics:
- `symbol` - Stock ticker (e.g., RELIANCE.NS)
- `previousClose`, `open`, `dayLow`, `dayHigh`
- `volume`, `trailingPE`, `trailingEps`
- `pegRatio`, `ebitda`, `totalDebt`, `totalRevenue`
- `debtToEquity`, `revenuePerShare`
- `earningsQuarterlyGrowth`, `revenueGrowth`

---

## 🧠 RAG System Details

### Vectorstore Building
1. Load CSV dataset with stock fundamentals
2. Convert each row → Document with combined columns
3. Embed using `sentence-transformers/all-MiniLM-L6-v2`
4. Store in FAISS index for fast similarity search

### Query Processing
1. User asks financial question
2. Retrieve top 3 similar documents from vectorstore
3. Fetch live stock data if symbol provided
4. Combine context + live data into LLM prompt
5. Generate financial analysis response

---

## 🎨 UI/UX Highlights

- **Dark Theme**: Professional gradient backgrounds
- **Responsive Grid Layout**: Works on desktop & tablets
- **Interactive Charts**: Chart.js with real-time updates
- **Smooth Animations**: Fade-in effects & transitions
- **Accessible Components**: Material-UI form controls

---

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with werkzeug
- CORS enabled for frontend-backend communication
- Environment variable protection for API keys
- Token expiration (6 hours)

---

## 📈 Performance Optimizations

- Deduplication of company symbols (prefer `.NS` over `.BO`)
- FAISS vectorstore for O(1) similarity search
- Frontend caching with localStorage
- Chart.js lazy rendering
- Efficient pandas operations for aggregations

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Vectorstore not found | Run `python build_vectorstore.py` |
| JWT decode error | Ensure `SECRET_KEY` matches in .env |
| CORS errors | Check `CORS(app)` in Flask |
| Data not loading | Verify `EXCEL_PATH` in .env points to CSV |
| Chat timeout | Check Groq API key & internet connection |
| Port already in use | Change port in Flask/React config |

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

---


