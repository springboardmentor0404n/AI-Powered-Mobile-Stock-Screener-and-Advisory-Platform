# Stock Analytics Application Documentation

## Overview

This application provides real-time analytics and insights for Indian and US stocks, including market overview, financial metrics, portfolio management, alerts, and more. It uses [Yahoo Finance](https://finance.yahoo.com/) via the `yfinance` Python library for all live data.

---

## Features

- **Real-time Stock Data**: Prices, market cap, volume, and more for Nifty 50 and major US stocks.
- **Market Overview**: Total stocks, market value, average volume, active stocks.
- **Financial Metrics**: EPS, P/E Ratio, Book Value, Dividend Yield, ROE, etc.
- **Quarterly Performance**: Real quarterly profit data for each company.
- **P/E Ratio & Sector Distribution**: Visual charts for market analysis.
- **Portfolio Management**: Add transactions, view holdings, track performance.
- **Alerts System**: Set price alerts for any stock.
- **Watchlist**: Track favorite stocks.
- **Authentication**: Login, registration, OTP verification, password reset.
- **Caching**: Optimized for speed with in-memory caching.

---

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, CSS, JavaScript (Chart.js for charts)
- **Database**: PostgreSQL (for users, portfolio, alerts, etc.)
- **APIs**: Yahoo Finance via `yfinance`
- **Deployment**: Local (Windows)

---

## Installation & Setup

1. **Clone the repository**  
   ```
   git clone <your-repo-url>
   cd final-info
   ```

2. **Install dependencies**  
   ```
   pip install -r requirements.txt
   pip install yfinance
   ```

3. **Configure environment variables**  
   - Create a `.env` file for email/DB credentials if needed.

4. **Start the server**  
   ```
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Access the app**  
   - Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

---

## API Endpoints

| Endpoint                       | Method | Description                        |
|---------------------------------|--------|------------------------------------|
| `/api/stock/{symbol}`           | GET    | Real-time quote for a stock        |
| `/api/stock/{symbol}/metrics`   | GET    | Financial metrics for a stock      |
| `/api/stock/{symbol}/history`   | GET    | Historical price data              |
| `/api/screener`                 | GET    | Screener for all stocks            |
| `/api/market/summary`           | GET    | Market indices summary             |
| `/api/nifty50`                  | GET    | List of Nifty 50 stocks            |
| `/api/search?q=...`             | GET    | Search stocks                      |
| `/api/cache/clear`              | POST   | Clear all caches                   |
| `/login`                        | GET    | Login page                         |
| `/register-page`                | GET    | Registration page                  |
| `/forgot-password-page`         | GET    | Password reset page                |

---

## Data Sources

- **Stock Data**: Yahoo Finance (`yfinance`)
- **Financial Metrics**: Yahoo Finance (`ticker.info`)
- **Quarterly Performance**: Yahoo Finance (`ticker.quarterly_income_stmt`)
- **Market Cap**: Yahoo Finance (`fast_info.market_cap` or `info['marketCap']`)

---

## Caching

- **Stock Quotes**: 60 seconds
- **Financial Metrics**: 5 minutes
- **Screener**: 5 minutes
- **Historical Data**: 10 minutes

---

## Troubleshooting

- **Site not loading**: Ensure FastAPI server is running and listening on `127.0.0.1:8000`.
- **Market cap shows 0**: Make sure `market_cap` fallback to `info['marketCap']` is implemented.
- **Charts blank**: Confirm screener returns `pe_ratio`, `industry`, and other required fields.
- **Quarterly graph empty**: Check `ticker.quarterly_income_stmt` returns valid data.

---

## Example Usage

- **View Market Overview**: Dashboard shows total stocks, market value, volume, etc.
- **Analyze a Stock**: Click a stock to view financial metrics and quarterly performance.
- **Add to Portfolio**: Use the portfolio page to add buy/sell transactions.
- **Set Alerts**: Create price alerts for any stock.
- **Watchlist**: Add stocks to your watchlist for quick access.

---

## Contact & Support

For issues, contact the developer or open an issue in the repository.

---

## License

MIT License (or specify your license)