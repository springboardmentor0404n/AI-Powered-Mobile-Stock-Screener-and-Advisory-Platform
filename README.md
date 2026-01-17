# AI Stock Screener 📈

**Developer:** V Naga Veeranna

An intelligent stock screening and analysis platform built with Flask (backend) and React (frontend). This application allows users to query stocks using natural language, set price alerts, upload historical data, and visualize market analytics through an AI-powered chat interface.

## Features 💡

### Core Functionality
- **Natural Language Stock Queries** 🗣️: Chat with AI to find stocks based on criteria like "high volume stocks" or "stocks below ₹500"
- **Real-time Market Data** 📊: Integration with MarketStack API for live NSE data
- **Historical Data Analysis** 📈: Upload CSV files with stock data for analysis and quarterly summaries
- **Price Alerts** 🔔: Set alerts for price thresholds, percentage changes, and volume spikes
- **User Authentication** 🔐: Secure login with email OTP verification
- **Vector Embeddings** 🤖: AI-powered data processing and storage using vector databases

### Technical Features
- **AI-Powered Parsing** 🧠: Uses Google Gemini AI to understand and process natural language queries
- **Quarterly Analysis** 📅: Support for multi-quarter historical data analysis
- **Responsive UI** 💻: Modern React interface with Material-UI components
- **RESTful API** 🌐: Well-structured Flask API with JWT authentication
- **Database Integration** 🗄️: PostgreSQL for user data and alerts

## Backend (Flask) ⚙️

### Backend Prerequisites 📋
- Python 3.8+
- PostgreSQL 12+
- Git

### Backend Dependencies 🔑
- **Google AI API Key**: For natural language processing (Gemini AI)
- **MarketStack API Key**: For real-time market data
- **SMTP Configuration**: For email OTP verification

### Backend Installation 🚀

#### Install Python Dependencies 🐍
```bash
pip install -r requirements.txt
```

#### Database Setup 🗄️
1. Install and start PostgreSQL
2. Create database:
```sql
CREATE DATABASE ai_screener_db;
```
3. Update `app/config.py` with your database credentials:
```python
DATABASE_URL = "postgresql://username:password@localhost:5432/ai_screener_db"
```

#### Environment Variables 🔐
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_google_ai_api_key_here
MARKET_API_KEY=your_marketstack_api_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@yourdomain.com
```

### Backend Architecture 🏗️
- **Authentication**: JWT-based auth with email OTP verification
- **API Routes**:
  - `/auth/*`: User registration, login, OTP verification
  - `/chat`: AI-powered stock queries
  - `/analytics/*`: Market data and analytics
  - `/alerts/*`: Alert management
  - `/upload`: CSV data upload with embedding generation
- **Services** 🔧: Email notifications, stock resolution, chat intelligence, alert processing
- **Data Processing**: Pandas-based CSV processing and filtering

### Backend Configuration ⚙️
- **Email Configuration** 📧: Update SMTP settings in `app/config.py` and `.env`
- **Market Data** 📊: Ensure MarketStack API key is valid for NSE data
- **Vector Database** 🤖: Uses FAISS for vector storage

## Frontend (React + Vite) 🎨

### Frontend Prerequisites 📋
- Node.js 16+
- Git

### Frontend Installation 🚀

#### Install Node Dependencies 📦
```bash
cd frontend/vite-project
npm install
```

### Frontend Architecture 🏗️
- **UI Framework**: Material-UI for consistent design
- **State Management**: Zustand for global state
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios for API communication

## Commands ▶️

### Development Mode 🛠️

#### Start Backend 🚀
```bash
python run.py
```
The backend will run on `http://localhost:5000`

#### Start Alert Monitoring Service 🔔 (Optional - Run in separate terminal)
```bash
python app\alert_service.py
```
This service runs continuously in the background, checking stock alerts every minute and sending notifications when conditions are met.

#### Start Frontend 🎯
```bash
cd frontend/vite-project
npm run dev
```
The frontend will run on `http://localhost:5173`

### Production Deployment 🌐
1. Build frontend:
```bash
cd frontend/vite-project
npm run build
```
2. Serve static files from `dist/` directory
3. Configure production server (Gunicorn, uWSGI) for Flask app
4. Set up reverse proxy (Nginx) for both frontend and backend

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-otp` - OTP verification
- `POST /auth/resend-otp` - Resend OTP

### Chat & Screening
- `POST /chat` - Natural language stock queries
- `POST /upload-csv` - Upload historical stock data

### Analytics
- `GET /analytics/market-status` - Current market status
- `GET /analytics/stock-data/<symbol>` - Historical data for a symbol

### Alerts
- `POST /alerts/create` - Create price alert
- `GET /alerts/user/<user_id>` - Get user alerts
- `DELETE /alerts/<alert_id>` - Delete alert

## Usage Examples

### Natural Language Queries
- "Show me high volume stocks"
- "Find stocks below ₹500"
- "Top 10 performing stocks last quarter"
- "Stocks with delivery percentage above 60%"

### Alert Creation
```json
{
  "user_id": 1,
  "symbol": "RELIANCE",
  "alert_type": "PRICE_THRESHOLD",
  "condition": "ABOVE",
  "value": 2500.00
}
```

### CSV Upload
Upload CSV files with columns: date, open, high, low, close, volume, turnover, trades, %deliverble

## Constraints & Limitations

### Technical Constraints
- **Python Version**: Requires Python 3.8+ (uses modern type hints and async features)
- **Database**: PostgreSQL required (uses specific PostgreSQL features)
- **Memory**: Vector embeddings require sufficient RAM for large datasets
- **API Limits**: Subject to MarketStack API rate limits and Google AI quotas

### Data Constraints
- **Market Data**: Currently optimized for NSE stocks
- **Historical Data**: CSV format must match expected schema
- **Real-time Updates**: Market data updates depend on API availability

### Security Constraints
- **Environment Variables**: All sensitive keys must be in .env file
- **CORS**: Frontend must run on configured origin (localhost:5173 by default)
- **JWT Tokens**: Implement token refresh for production use

### Performance Constraints
- **Query Processing**: AI parsing may have latency for complex queries
- **Data Processing**: Large CSV files may require significant processing time
- **Concurrent Users**: Database connection pooling needed for high traffic

## Development

### Project Structure 📁
```
├── app/
│   ├── __init__.py      # Flask app factory
│   ├── alert_service.py # Background alert monitoring service
│   ├── app.py           # Main app file
│   ├── config.py        # Configuration settings
│   ├── db.py            # Database models and connections
│   ├── extensions.py    # Flask extensions
│   ├── routes/          # API endpoints
│   │   ├── alerts.py    # Alert management routes
│   │   ├── analytics.py # Market analytics routes
│   │   ├── auth_routes.py # Authentication routes
│   │   ├── chat.py      # Chat and stock queries
│   │   ├── gateway_routes.py # API gateway routes
│   │   └── upload.py    # File upload routes
│   ├── models/          # Database models
│   │   ├── api_key.py   # API key model
│   │   ├── email_otp.py # OTP model
│   │   └── email_user.py # User model
│   ├── services/        # Business logic
│   │   ├── chat_intelligence.py # Chat AI logic
│   │   ├── emailer.py   # Email service
│   │   ├── forwarder.py # Data forwarding service
│   │   └── stock_resolver.py # Stock symbol resolution
│   ├── embeddings/      # Vector processing
│   │   ├── embedder.py  # Embedding generation
│   │   └── vector_db.py # Vector database operations
│   ├── llm/            # AI integration
│   │   ├── parser.py    # Query parsing
│   │   └── prompt.py    # AI prompts
│   ├── screener/       # Stock screening logic
│   │   └── runner.py    # Screener engine
│   └── utils/          # Utility functions
│       ├── hash_utils.py # Password hashing
│       └── otp.py       # OTP generation
├── data/               # Data storage
│   ├── uploads/        # Uploaded CSV files
│   ├── vector.index    # Vector database index
│   └── cache/          # Cached data
├── database/           # Database operations
│   ├── embeddings_repo.py # Embedding repository
│   └── postgres.py     # PostgreSQL connections
├── frontend/           # React frontend
│   └── vite-project/   # Vite React app
├── tests/              # Test suites
│   ├── test_alert_processing.py
│   ├── test_api_response_time.py
│   ├── test_concurrent_requests.py
│   ├── test_csv_processing.py
│   ├── test_db_query_time.py
│   ├── test_health_check.py
│   └── test_notifications_time.py
├── run.py              # Application entry point
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

### Testing
Run tests with:
```bash
python -m pytest tests/
```

### Code Quality
- Use `flake8` for linting
- Follow PEP 8 style guidelines
- Add type hints for better code maintainability

## Troubleshooting

### Common Issues
1. **Database Connection Failed**: Check PostgreSQL service and credentials
2. **API Key Errors**: Verify .env file and API key validity
3. **CORS Errors**: Ensure frontend runs on configured port
4. **Email Not Sending**: Check SMTP configuration and credentials

### Logs
- Backend logs available in terminal/console
- Check `app/logs/` for detailed error logs
- Frontend errors in browser console

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions:
- Check the troubleshooting section
- Review API documentation
- Contact the development team

---

**Note**: This application is for educational and research purposes. Always verify data accuracy and consult financial professionals before making investment decisions.</content>
