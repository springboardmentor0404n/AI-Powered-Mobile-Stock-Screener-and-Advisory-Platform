# 📈 Stock Market Analytics Platform

A comprehensive, production-ready stock market analytics platform with AI-powered chatbot, real-time stock data visualization, and user authentication.

## 🚀 Features

### Core Features
- **User Authentication**: Secure registration and login with email OTP verification
- **Stock Data Visualization**: Interactive charts and dashboards for market analysis
- **AI Chatbot**: Intelligent stock assistant powered by GROQ AI with RAG (Retrieval Augmented Generation)
- **Real-time Analytics**: Live market data with KPIs and performance metrics
- **Company Search**: Detailed company profiles with financial metrics and charts

### Technical Features
- RESTful API with FastAPI
- JWT-based authentication
- PostgreSQL database with SQLAlchemy
- Responsive UI with Chart.js
- Vector embeddings for semantic search
- Production-grade error handling and logging

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python web framework)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- JWT (Authentication)
- Sentence Transformers (AI embeddings)
- GROQ API (LLM for chatbot)

**Frontend:**
- HTML5, CSS3, JavaScript
- Chart.js (Data visualization)
- Responsive design

**DevOps:**
- Uvicorn (ASGI server)
- Python-dotenv (Environment management)
- Logging & Monitoring

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL 12+
- GROQ API key (for AI chatbot)
- SMTP credentials (for email)

## 🔧 Installation

### 1. Clone the Repository
```bash
cd final-info
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\\Scripts\\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/stock_market_db

# Security
SECRET_KEY=your-super-secret-key-here

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
TESTING=False

# AI Chatbot
GROQ_API_KEY=your-groq-api-key

# App
ENV=production
DEBUG=False
```

**Important:**
- Generate a strong `SECRET_KEY`: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
- Get GROQ API key from [console.groq.com](https://console.groq.com/)

### 5. Database Setup

Create PostgreSQL database:
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE stock_market_db;

# Exit
\\q
```

Initialize tables:
```bash
python init_database.py
```

### 6. Seed Stock Embeddings (for AI Chatbot)
```bash
python seed_embeddings.py
```

This will:
- Load stock data from CSV files
- Generate vector embeddings
- Store them in the database for semantic search

## 🚀 Running the Application

### Development Mode
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Access the application:
- **Main App**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 📁 Project Structure

```
final-info/
├── main.py                      # FastAPI application entry point
├── database.py                  # Database connection and utilities
├── auth_utils.py                # Authentication helpers (JWT, password hashing)
├── email_utils.py               # Email sending functionality
├── init_database.py             # Database initialization script
├── seed_embeddings.py           # Seed AI embeddings for chatbot
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
├── README.md                    # This file
│
├── services/
│   ├── chatbot_service.py      # AI chatbot with RAG
│   └── stock_service.py        # Stock data management
│
├── templates/
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   ├── verify_otp.html         # OTP verification
│   └── dashboard.html          # Main dashboard
│
├── static/
│   ├── script.js               # Frontend JavaScript
│   ├── style.css               # Styling
│   └── chart.min.js            # Chart.js library
│
└── STOCK_DATA_CLEANING/
    ├── nifty50_cleaned.csv     # Market data
    └── fundamental_data.csv    # Fundamental data
```

## 🔑 API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /verify-otp` - Verify email OTP
- `POST /login` - User login

### Stock Data
- `GET /api/screener` - Get all stocks
- `GET /api/company/{symbol}` - Get company details

### AI Chatbot
- `POST /api/chat` - Chat with AI assistant (requires auth)

### Utility
- `GET /api/health` - Health check

## 💬 Using the AI Chatbot

The AI chatbot uses RAG (Retrieval Augmented Generation) to answer questions about stocks:

1. **Ask Questions**: Type questions in natural language
2. **Context-Aware**: Searches your stock database for relevant information
3. **Intelligent Responses**: Uses GROQ's LLM to generate accurate answers

Example questions:
- "What are the top performing stocks today?"
- "Tell me about Reliance stock"
- "Which stocks have high P/E ratios?"
- "Compare TCS and Infosys"

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Email OTP verification
- Environment variable protection
- SQL injection prevention
- CORS protection
- Rate limiting ready

## 📊 Stock Data

The platform uses two CSV files:
- **nifty50_cleaned.csv**: Daily market data (price, volume, etc.)
- **fundamental_data.csv**: Company fundamentals (P/E ratio, EPS, etc.)

Update these files regularly for latest data.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check connection string in .env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

### Email Not Sending
- Enable "Less secure app access" for Gmail
- Use App Password instead of regular password
- Set `TESTING=True` in `.env` to print OTP to console

### Chatbot Not Working
- Verify GROQ_API_KEY is set correctly
- Run `python seed_embeddings.py` to populate embeddings
- Check logs for error messages

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use different port
uvicorn main:app --port 8001
```

## 🧪 Testing

Set `TESTING=True` in `.env` to:
- Print OTP to console instead of sending email
- Enable debug logging

## 📈 Performance Optimization

- Database connection pooling
- Lazy loading of ML models
- Batch processing for embeddings
- Efficient vector similarity search
- Proper indexing on database

## 🔄 Future Enhancements

- [ ] Redis caching for API responses
- [ ] WebSocket for real-time updates
- [ ] Advanced charting with technical indicators
- [ ] Portfolio management
- [ ] Stock price predictions
- [ ] Mobile app
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Check the documentation
- Review closed issues
- Open a new issue with details

## 🙏 Acknowledgments

- Stock data from NSE India
- GROQ for AI capabilities
- FastAPI for excellent framework
- Chart.js for visualizations

---

**Built with ❤️ for the Indian Stock Market**
