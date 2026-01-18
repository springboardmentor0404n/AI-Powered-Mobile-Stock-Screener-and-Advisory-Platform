# Stock Market Dashboard - PostgreSQL Version

This is the PostgreSQL implementation of the stock market dashboard backend.

## Setup Instructions

1. **Install PostgreSQL**:
   - Download and install PostgreSQL from https://www.postgresql.org/
   - During installation, note the username (usually 'postgres') and password you set

2. **Create Database**:
   ```sql
   CREATE DATABASE stock_dashboard;
   ```

3. **Update Environment Variables**:
   Edit the `.env` file with your PostgreSQL credentials:
   ```
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=stock_dashboard
   ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the Application**:
   ```bash
   uvicorn main:app --reload --port 8001
   ```

## Key Changes from SQLite Version

- Database engine changed from SQLite to PostgreSQL
- Connection pooling implemented for better performance
- String length specifications added for PostgreSQL compatibility
- TEXT fields used for longer text content

## Migration Notes

The database schema remains the same, so migrating from SQLite to PostgreSQL preserves all data structure.