import psycopg2

def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="sample",
        user="postgres",
        password="post",
        port = 5432
    )