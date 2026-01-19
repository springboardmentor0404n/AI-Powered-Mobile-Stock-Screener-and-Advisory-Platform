import psycopg2

def get_connection():
    return psycopg2.connect(
        dbname="ai_stock_app",
        user="postgres",
        password="postgres",   # password you set in pgAdmin
        host="localhost",
        port="5432"
    )
