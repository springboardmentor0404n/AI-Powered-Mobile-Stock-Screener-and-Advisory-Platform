from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import jwt
import datetime
from datetime import timezone
import os
import pandas as pd
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# RAG
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

# Live market data
import yfinance as yf

# --------------------------------------------------
# LOAD ENV
# --------------------------------------------------
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

SECRET_KEY = os.getenv("SECRET_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
EXCEL_PATH = os.getenv("EXCEL_PATH")

VECTOR_PATH = "vectorstore"
DATASET_SNAPSHOT = "dataset_symbols.txt"

# --------------------------------------------------
# APP
# --------------------------------------------------
app = Flask(__name__)
CORS(app)

# --------------------------------------------------
# DB
# --------------------------------------------------
def get_db_connection():
    return psycopg2.connect(
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )

# --------------------------------------------------
# JWT VERIFY
# --------------------------------------------------
def verify_token():
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        return None

# --------------------------------------------------
# LLM
# --------------------------------------------------
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model="llama-3.1-8b-instant",
    temperature=0.3,
)

# --------------------------------------------------
# EMBEDDINGS
# --------------------------------------------------
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# --------------------------------------------------
# VECTORSTORE
# --------------------------------------------------
if os.path.exists(VECTOR_PATH):
    vectorstore = FAISS.load_local(
        VECTOR_PATH,
        embeddings,
        allow_dangerous_deserialization=True,
    )
else:
    vectorstore = None

# --------------------------------------------------
# ALERT HELPERS
# --------------------------------------------------
def create_alert(alert_type, symbol, message):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 1 FROM alerts
        WHERE type=%s AND symbol=%s AND message=%s
        AND created_at > NOW() - INTERVAL '10 minutes'
    """, (alert_type, symbol, message))

    if cur.fetchone():
        cur.close()
        conn.close()
        return

    cur.execute("""
        INSERT INTO alerts (type, symbol, message)
        VALUES (%s, %s, %s)
    """, (alert_type, symbol, message))

    conn.commit()
    cur.close()
    conn.close()

# --------------------------------------------------
# ✅ FIXED DATASET DETECTION (ONLY CHANGE)
# --------------------------------------------------
def detect_new_stocks(df):
    current_symbols = set(
        df["symbol"]
        .astype(str)
        .str.strip()
        .str.upper()
        .unique()
    )

    # First-ever run → create snapshot → NO alerts
    if not os.path.exists(DATASET_SNAPSHOT):
        with open(DATASET_SNAPSHOT, "w") as f:
            f.write("\n".join(sorted(current_symbols)))
        return []

    with open(DATASET_SNAPSHOT, "r") as f:
        previous_symbols = set(
            line.strip().upper()
            for line in f.readlines()
            if line.strip()
        )

    new_symbols = current_symbols - previous_symbols

    if new_symbols:
        updated = previous_symbols.union(current_symbols)
        with open(DATASET_SNAPSHOT, "w") as f:
            f.write("\n".join(sorted(updated)))

    return list(new_symbols)

# --------------------------------------------------
# LIVE MARKET ALERTS
# --------------------------------------------------
def live_market_alerts(symbols):
    for sym in symbols:
        try:
            stock = yf.Ticker(sym + ".NS")
            info = stock.info

            price = info.get("regularMarketPrice")
            prev = info.get("previousClose")
            volume = info.get("volume")
            avg_volume = info.get("averageVolume")

            if price and prev:
                pct = ((price - prev) / prev) * 100
                if abs(pct) >= 2:
                    create_alert("MARKET_PRICE", sym, f"{sym} moved {pct:.2f}% today")

            if volume and avg_volume and volume > avg_volume * 2:
                create_alert("MARKET_VOLUME", sym, f"{sym} volume spike detected")

        except:
            continue

# --------------------------------------------------
# AUTH
# --------------------------------------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    hashed = generate_password_hash(data["password"])

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE email=%s", (data["email"],))
    if cur.fetchone():
        return jsonify({"message": "Email exists"}), 400

    cur.execute(
        "INSERT INTO users (username,email,password) VALUES (%s,%s,%s)",
        (data["username"], data["email"], hashed),
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Signup successful"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s", (data["email"],))
    user = cur.fetchone()

    if not user or not check_password_hash(user[3], data["password"]):
        return jsonify({"success": False}), 401

    token = jwt.encode(
        {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "exp": datetime.datetime.now(timezone.utc) + datetime.timedelta(hours=6),
        },
        SECRET_KEY,
        algorithm="HS256",
    )
    return jsonify({"success": True, "token": token})

# --------------------------------------------------
# DASHBOARD INSIGHTS
# --------------------------------------------------
@app.route("/dashboard/insights", methods=["GET"])
def dashboard_insights():
    try:
        if not EXCEL_PATH or not os.path.exists(EXCEL_PATH):
            return jsonify({"error": "Dataset file not found"}), 500

        df = pd.read_csv(EXCEL_PATH) if EXCEL_PATH.endswith(".csv") else pd.read_excel(EXCEL_PATH)

        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("%", "")

        new_stocks = detect_new_stocks(df)
        for stock in new_stocks:
            create_alert("DATASET_NEW_STOCK", stock, f"New stock {stock} added to dataset")

        df = df.dropna(subset=["symbol", "close"])
        marketData = df.copy()
        marketData.rename(columns=lambda x: x.capitalize(), inplace=True)

        return jsonify({"marketData": marketData.to_dict(orient="records")})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------
# LIVE CANDLES
# --------------------------------------------------
@app.route("/live/candles/<symbol>")
def live_candles(symbol):
    interval = request.args.get("interval", "1m")

    INTERVAL_MAP = {
        "1m": {"interval": "1m", "period": "1d"},
        "5m": {"interval": "5m", "period": "5d"},
        "15m": {"interval": "15m", "period": "5d"},
        "1d": {"interval": "1d", "period": "6mo"},
        "1w": {"interval": "1wk", "period": "2y"},
        "1mo": {"interval": "1mo", "period": "5y"},
    }

    config = INTERVAL_MAP.get(interval, INTERVAL_MAP["1m"])
    df = yf.Ticker(symbol + ".NS").history(interval=config["interval"], period=config["period"])

    candles = [{
        "time": int(idx.timestamp()),
        "open": round(row["Open"], 2),
        "high": round(row["High"], 2),
        "low": round(row["Low"], 2),
        "close": round(row["Close"], 2),
    } for idx, row in df.iterrows()]

    return jsonify({"candles": candles})

# --------------------------------------------------
# ALERT ROUTES
# --------------------------------------------------
@app.route("/alerts", methods=["GET"])
def get_alerts():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, type, symbol, message, is_read, created_at
        FROM alerts ORDER BY created_at DESC LIMIT 50
    """)
    rows = cur.fetchall()
    cur.execute("SELECT COUNT(*) FROM alerts WHERE is_read = FALSE")
    unread = cur.fetchone()[0]
    cur.close()
    conn.close()

    return jsonify({
        "unread_count": unread,
        "alerts": [{
            "id": r[0],
            "type": r[1],
            "symbol": r[2],
            "message": r[3],
            "is_read": r[4],
            "created_at": r[5].isoformat()
        } for r in rows]
    })

@app.route("/alerts/read", methods=["POST"])
def mark_alert_read():
    alert_id = request.json.get("id")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE alerts SET is_read=TRUE WHERE id=%s", (alert_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/alerts/run", methods=["POST"])
def run_alerts():
    df = pd.read_csv(EXCEL_PATH)
    symbols = df["symbol"].unique()[:10]
    live_market_alerts(symbols)
    return jsonify({"status": "alerts generated"})

# --------------------------------------------------
# CHAT
# --------------------------------------------------
@app.route("/chat", methods=["POST"])
def chat():
    user = verify_token()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    body = request.json
    query = body.get("query", "")
    symbol = body.get("symbol")

    context = ""
    if vectorstore:
        docs = vectorstore.similarity_search(query, k=3)
        context = "\n".join(d.page_content for d in docs)

    live_data = ""
    if symbol:
        info = yf.Ticker(symbol).info
        live_data = "\n".join(
            f"{k}: {v}" for k, v in info.items()
            if k in ["open", "dayHigh", "dayLow", "previousClose", "volume"]
        )

    response = llm.invoke(f"CONTEXT:\n{context}\nLIVE:\n{live_data}\nQ:{query}")
    return jsonify({"answer": response.content})

# --------------------------------------------------
# START
# --------------------------------------------------
if __name__ == "__main__":
    app.run(port=5001, debug=True)
