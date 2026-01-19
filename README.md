# AI-Powered Mobile Stock Screener & Advisory Platform
**Developer: Ankita Pawar**

A sophisticated full-stack application that combines a **Flutter** mobile interface with a **FastAPI** backend to provide real-time stock insights, automated portfolio management, and AI-driven market advisory using RAG (Retrieval-Augmented Generation).

---

## 🚀 Features

### 📱 Frontend (Flutter Mobile App)
* **Intelligent Dashboard**: Real-time KPI tracking for Nifty 50 stocks with interactive FL-Charts.
* **AI Market Bot**: A built-in chat interface powered by Gemini to answer complex market queries and provide data-driven advisory.
* **Live Data & Charts**: Professional-grade candlestick charts for technical analysis.
* **Smart Watchlist & Portfolio**: Track favorite stocks and execute "virtual trades" with real-time profit/loss calculations.
* **Push Notifications**: Firebase-powered alerts for target price hits and new stock additions.

### ⚙️ Backend (FastAPI & AI)
* **RAG Engine**: Advanced Retrieval-Augmented Generation using `LangChain`, `HuggingFace Embeddings`, and `PGVector` for high-accuracy stock analysis.
* **Market Data Integration**: Real-time data fetching via MarketStack API.
* **Automated Alert System**: Background tasks to monitor price movements and trigger Firebase Cloud Messaging (FCM) notifications.
* **Secure Auth**: JWT-based authentication with support for Google OAuth.

---

## 🛠️ Tech Stack

### Frontend
* **Framework**: Flutter (Dart)
* **State Management**: Provider / StatefulWidget
* **Charts**: FL Chart, Candlesticks
* **Backend Communication**: HTTP / JSON
* **Cloud**: Firebase (Messaging & Auth)

### Backend
* **Framework**: FastAPI (Python)
* **Database**: PostgreSQL with PGVector (Vector Search)
* **OR Mapper**: SQLAlchemy
* **AI/LLM**: Google Gemini (via LangChain)
* **Embeddings**: HuggingFace (all-MiniLM-L6-v2)

---

## 📂 Project Structure

```text
stock_RAG2/
├── backend/                # FastAPI Application
│   ├── main2.py            # Primary API & Auth Logic
│   ├── main3.py            # Live Data & Notification Logic
│   ├── retriever.py        # LangChain & Gemini RAG Implementation
│   ├── parser2.py          # Data ingestion and Vector DB setup
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables (Hidden)
├── frontend/               # Flutter Application
│   ├── lib/
│   │   ├── main.dart       # App Entry Point & Theme
│   │   ├── dashboard.dart  # Main KPI & Chart UI
│   │   ├── ai_bot.dart     # Gemini AI Chat Interface
│   │   ├── portfolio.dart  # Trade execution & Tracking
│   │   └── watchlist_screen.dart
|   |   ├── live_data.dart
|   |   ├── notification_center_screen.dart
|   |   ├── firebase_options.dart       # Feature-specific screens
│   └── pubspec.yaml        # Flutter dependencies
├── .gitignore              # Global exclusion rules
└── README.md               # Project documentation

🛠️ Setup Instructions
Backend Setup
Navigate to the backend/ folder.

Install dependencies:

Bash

pip install -r requirements.txt
Configure your .env file with your DATABASE_URL, GOOGLE_API_KEY, and MARKETSTACK_KEY.

Run the server:

Bash

uvicorn main2:app --reload
Frontend Setup
Navigate to the frontend/ folder.

Install Flutter packages:

Bash

flutter pub get
Ensure your firebase_options.dart is correctly configured for your project.

Run the application:

Bash

flutter run
