# 📊 AI-Powered Mobile Stock Screener & Advisory Platform

**Developer:** Ankita Pawar  
**Internship Project | Infosys**

A sophisticated **full-stack AI-driven stock analysis platform** that combines a **Flutter mobile application** with a **FastAPI backend** to deliver real-time market insights, intelligent stock screening, automated portfolio tracking, and AI-powered advisory using **Retrieval-Augmented Generation (RAG)**.

---

## 🚀 Project Overview

This platform enables users to interact with the stock market using **natural language queries**, visualize real-time data through interactive charts, manage virtual portfolios, and receive intelligent recommendations powered by **LLMs** and **vector search**.

Example queries:
- *“Show NSE stocks with PE below 10 and high promoter holding”*
- *“Which stocks are trending today with bullish indicators?”*

---

## ✨ Key Features

### 📱 Frontend (Flutter Mobile App)

- **Intelligent Dashboard**
  - Real-time KPIs for Nifty 50 stocks
  - Interactive charts using FL Chart

- **AI Market Bot**
  - Conversational AI powered by Google Gemini
  - Supports complex stock-related queries and advisory

- **Live Market Data**
  - Candlestick charts for technical analysis
  - Real-time price updates

- **Smart Watchlist & Portfolio**
  - Track favorite stocks
  - Virtual trading with live P&L calculation

- **Push Notifications**
  - Firebase-powered alerts for:
    - Target price hits
    - Watchlist updates
    - Market movements

---

### ⚙️ Backend (FastAPI & AI)

- **RAG Engine**
  - LangChain-based Retrieval-Augmented Generation
  - HuggingFace embeddings with PGVector for semantic search

- **Market Data Integration**
  - Live stock data via MarketStack API

- **Automated Alert System**
  - Background tasks monitoring stock prices
  - Firebase Cloud Messaging (FCM) notifications

- **Authentication & Security**
  - JWT-based authentication
  - Google OAuth support

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Flutter (Dart)
- **State Management:** Provider / StatefulWidget
- **Charts:** FL Chart, Candlestick Charts
- **Networking:** HTTP / JSON
- **Cloud Services:** Firebase (Auth & Messaging)

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL + PGVector
- **ORM:** SQLAlchemy
- **AI / LLM:** Google Gemini (via LangChain)
- **Embeddings:** HuggingFace (`all-MiniLM-L6-v2`)
- **APIs:** MarketStack

---

## 📂 Project Structure

```text
stock_RAG2/
├── backend/
│   ├── main2.py                    # Core API & Authentication
│   ├── main3.py                    # Live data & notifications
│   ├── retriever.py                # LangChain RAG implementation
│   ├── parser2.py                  # Data ingestion & vector DB setup
│   ├── requirements.txt            # Backend dependencies
│   └── .env                        # Environment variables (ignored)
│
├── frontend/
│   ├── lib/
│   │   ├── main.dart               # App entry point & theme
│   │   ├── dashboard.dart          # Dashboard & KPIs
│   │   ├── ai_bot.dart             # AI chat interface
│   │   ├── portfolio.dart          # Portfolio tracking
│   │   ├── watchlist_screen.dart   # Watchlist management
│   │   ├── live_data.dart          # Live market data
│   │   ├── notification_center_screen.dart
│   │   └── firebase_options.dart   # Firebase configuration
│   └── pubspec.yaml                # Flutter dependencies
│
├── .gitignore
└── README.md
```

## ⚙️ Setup Instructions

### 🔹 1. Backend Setup (FastAPI)

The backend handles AI processing, market data retrieval, authentication, and notifications.

#### Navigate to Backend Directory
bash
cd backend

#### Create Virtual Environment (Recommended)
```bash
python -m venv venv
```

### Activate the Environment
 **Windows :**
 ```bash
 .\venv\Scripts\activate
```
**macOS / Linux :**
```bash
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Environment Configuration

**Create a .env file inside the backend/ directory and add:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/stockdb
GOOGLE_API_KEY=your_gemini_api_key
MARKETSTACK_KEY=your_marketstack_api_key
```

### Run the Backend Server
```bash
uvicorn main2:app --reload
```
--------
### 2. Frontend Setup (Flutter)

The frontend provides the mobile interface for interacting with the AI and stock data.

### Navigate to Frontend Directory
```bash
cd frontend
```

### Install Flutter Dependencies
```bash
flutter pub get
```

### Firebase Configuration
Configure Firebase using FlutterFire CLI
Ensure firebase_options.dart is generated

**Place the following files in their respective directories:**
google-services.json (Android)
GoogleService-Info.plist (iOS)

### Run the Application
# Ensure emulator or physical device is connected
```bash
flutter run
```



