# Use Python 3.11 slim image
# Updated: 2026-01-22 - Gemini 2.5 model integration
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check (matches PORT)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests, os; port=os.environ.get('PORT', '8000'); requests.get(f'http://localhost:{port}/health')"

# Run the application using shell form to expand $PORT
CMD sh -c "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"
