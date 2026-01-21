# 🚀 AI-Powered Mobile Stock Screener and Advisory Platform

A comprehensive, production-ready mobile application for real-time stock screening, market analysis, and AI-powered investment advisory. Built with modern technologies for scalability, performance, and best-in-class user experience.

## 📱 Overview

This platform provides retail investors with institutional-grade tools for stock market analysis, featuring real-time price updates, technical indicators, AI-powered chat advisory, and advanced screening capabilities.

**Key Features:**
- 📊 **Real-time stock price updates** via WebSocket (Angel One SmartAPI)
- 🤖 **AI-powered investment advisory** (Google Gemini 1.5 Flash)
- 📈 **Interactive Charts** with technical indicators
- 🔍 **Multi-criteria stock screener**
- 📰 **Breaking news alerts** (Finnhub & NewsAPI)
- 💼 **Portfolio tracking** and watchlist management
- 🔔 **Push notifications** for price alerts and news

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│                    Expo + TypeScript + Zustand               │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                   FastAPI Backend (Python)                   │
│              JWT Auth + Real-time Processing                 │
└────────┬──────────────────────┬─────────────────────────────┘
         │                      │
    ┌────┴────┐          ┌──────┴──────┐
    │ Redis   │          │ Firebase    │
    │ L1 Cache│          │ Auth +      │
    │         │          │ Firestore   │
    └─────────┘          └──────┬──────┘
                                │
                    ┌───────────┴────────────┐
                    │   External Data APIs   │
                    │ Angel One • Google AI  │
                    │ Finnhub • NewsAPI      │
                    └────────────────────────┘
```

---

## 🛠️ Technology Stack

### **Frontend (Mobile App)**

#### Core Framework
- **React Native 0.81+** - Cross-platform mobile development
- **Expo ~52.0** - Managed workflow for easy development
- **TypeScript** - Type-safe JavaScript

#### UI & Logic
- **GlueStack UI** - Pre-built accessible components
- **Zustand** - Lightweight state management
- **React Navigation 7** - Seamless screen transitions
- **Lucide React Native** - Modern vector icons

### **Backend (API Server)**

#### Core Framework
- **FastAPI** - High-performance async Python framework
- **Uvicorn** - ASGI server
- **Python 3.11+**

#### Database & Storage
- **Firebase Firestore** - NoSQL database for users, portfolios, chat history
- **Redis** - In-memory caching for real-time market data
- **Firebase Authentication** - Secure user identity management

#### Integrations
- **Angel One SmartAPI** - Real-time market data feed & historical candles
- **Google Gemini API** - Generative AI for investment advice
- **Finnhub** - Market news and sentiment
- **Firebase Admin SDK** - Backend integration

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Redis** 7+ (Running locally or via Docker)
- **Expo CLI** (`npm install -g expo-cli`)
- **Firebase Project** (with Firestore and Auth enabled)

### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Mac/Linux
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Firebase Setup**:
   - Create a project in [Firebase Console](https://console.firebase.google.com/).
   - Generate a **Service Account Key** (Project Settings > Service Accounts > Generate New Private Key).
   - Save the file as `firebase-credentials.json` inside the `backend/` directory.

5. **Environment Configuration**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update your API keys in `.env`:
     ```env
     # Firebase
     FIREBASE_CREDENTIALS=firebase-credentials.json

     # Angel One (Market Data)
     ANGELONE_API_KEY=your_key
     ANGELONE_CLIENT_CODE=your_id
     ...

     # AI Model
     GOOGLE_API_KEY=your_gemini_key 

     # Redis
     REDIS_HOST=localhost
     REDIS_PORT=6379
     ```

6. **Start the server**:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   API Docs available at: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API URL**:
   - Create `.env` in `frontend/`:
     ```env
     EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LOCAL_IP>:8000
     ```
   *(Replace `<YOUR_LOCAL_IP>` with your machine's actual IP, e.g., `192.168.1.5`)*

4. **Start the app**:
   ```bash
   npx expo start
   ```
   - Press `a` for Android Emulator
   - Scan QR code with **Expo Go** on physical device

---

## 📱 Features Breakdown

### 1. Market Dashboard
- **Top Movers**: Real-time gainers and losers (Top 5).
- **Indices**: NIFTY 50 and SENSEX live tracking.
- **News Feed**: Curated market news from the last 48 hours.

### 2. AI Advisory (Gemini)
- **Chat Interface**: Ask natural language questions like "Should I buy Reliance?".
- **Context Aware**: Knows about stock prices and history.
- **Safety**: Includes disclaimers for educational purpose.

### 3. Screener
- **Filter Stocks**: Filter by sector, price, volume, and technicals.
- **Presets**: Quick access to "Top Gainers", "Blue Chips", etc.

### 4. Smart Notifications
- **Bell Icon**: Quick access to recent important market updates.
- **Limit**: Optimized to show most relevant recent news.

---

## 🧪 Testing

### Backend
Run Pytest suite:
```bash
cd backend
pytest
```

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Author:** Himanshu Dubey  
**Contact:** h.dubey1605@gmail.com
