# AI Stock Screener 📈🤖

> **Intelligent Market Analysis using Generative AI**

## 📖 Introduction
The **AI Stock Screener** is a next-generation financial analysis tool designed to bridge the gap between complex market data and retail investors. Traditional stock screeners often require intricate knowledge of financial ratios and specific query syntaxes. This project introduces a **Natural Language Processing (NLP)** based interface powered by **Google's Gemini 1.5 Flash LLM**, allowing users to ask questions like *"Show me debt-free IT companies"* or *"Explain the pros and cons of Reliance"* in plain English.

The system integrates real-time market data ingestion, technical analysis (RSI, Moving Averages), and fundamental analysis into a unified dashboard.

---

## 🚀 Key Features

### 1. 🧠 Generative Query Engine
- **Natural Language to SQL**: Converts questions like "Stocks with PE < 20 and ROE > 15" into precise database queries.
- **Hybrid Search**: Fallback mechanisms ensure results even if the AI is uncertain, using keyword matching.

### 2. 📊 Real-Time Market Intelligence
- **Market Movers**: Live feed of Top Gainers and Losers.
- **News Sentiment**: Automated analysis of news headlines (Positive/Negative/Neutral) to gauge market mood.

### 3. 📝 AI-Generated Pros & Cons
- **Instant Analysis**: Dynamically generates a list of 3-5 Pros and Cons for any stock based on its latest fundamentals and news.
- **Visual Indicators**: Color-coded output (Green for Pros, Red for Cons) for quick decision-making.

### 4. 📱 Cross-Platform Experience
- **Mobile First**: Built with **React Native (Expo)** for a smooth experience on iOS and Android.
- **Web Compatible**: Fully responsive web version available.
- **Dark Mode**: Built-in theme switching for comfortable viewing day or night.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native (Expo)
- **Styling**: Custom Design System (Dark/Light specific tokens)
- **Navigation**: React Navigation (Stack)
- **Icons**: Ionicons

### Backend
- **Framework**: FastAPI (Python 3.10+) -> High-performance, async-ready.
- **AI Model**: Google Gemini 1.5 Flash (via `google-generativeai`).
- **Database**: PostgreSQL (Structured Data) + AsyncPG.
- **Data Ingestion**: `yfinance` API for real-time market data.
- **Data Visualization**: `matplotlib` (server-side generation) / `chart.js` (client-side).

---

## 🏗️ System Architecture

1.  **User Layer**: The React Native app captures user intent (voice/text).
2.  **API Gateway**: FastAPI endpoints (`/query`, `/market`, `/stock/{id}`) handle requests.
3.  **Intelligence Layer**:
    *   **Query Parser**: Gemini 1.5 interprets natural language -> JSON intent.
    *   **Analyst Agent**: Gemini 1.5 generates qualitative Pros/Cons.
4.  **Data Layer**:
    *   **PostgreSQL**: Stores Stock Fundamentals (PE, ROE, etc.) and Historical Prices.
    *   **Background Tasks**: Periodically fetch live prices and news using `yfinance`.

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js & npm
- PostgreSQL Database
- Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment
# Create a .env file with:
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname
# GEMINI_API_KEY=your_api_key_here
# SECRET_KEY=your_secret_key

# Run the server
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Start the app
npx expo start
# Press 'w' for Web, or scan QR code with Expo Go on Android/iOS
```

---

## 🔮 Future Scope
- **Agentic Workflows**: Autonomous agents that monitor portfolios and suggest rebalancing.
- **RAG for Reports**: "Chat with PDF" feature to query Annual Reports directly.
- **Broker Integration**: Direct "Buy/Sell" execution via Zerodha/AngelOne APIs.
- **Social Sentiment**: Integrating Twitter/Reddit sentiment streams.

---

## 📜 License
This project is developed for educational/internship purposes 
