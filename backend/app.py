from semantic_search import semantic_search
from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import psycopg2
import jwt
import datetime
import hashlib
from functools import wraps
import requests
import re
import yfinance as yf
import smtplib
from email.mime.text import MIMEText

def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = "kh3059843@gmail.com"
        msg["To"] = to_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
      EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
server.login(EMAIL_USER, EMAIL_PASS)

        server.send_message(msg)
        server.quit()
        print("✅ Email sent to", to_email)
    except Exception as e:
        print("Email error:", e)

app = Flask(__name__)
CORS(app)

# ================= CONFIG =================
CSV_FILE = "data/company_level_data.csv"
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")

# ================= DB =================
def get_connection():
    return psycopg2.connect(
        dbname="ai_stock_app",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )

# ================= JWT =================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            token = token.replace("Bearer ", "")
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = data["user_id"]
        except:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

# ================= CSV =================
def load_csv_stocks():
    stocks = {}
    with open(CSV_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sym = row["Symbol"].upper()
            price = float(row["Close"])
            if sym not in stocks:
                stocks[sym] = {
                    "symbol": sym,
                    "price": price,
                    "history": {"labels": [], "prices": []}
                }
            stocks[sym]["history"]["labels"].append(
                f"Day {len(stocks[sym]['history']['labels'])+1}"
            )
            stocks[sym]["history"]["prices"].append(price)
    return list(stocks.values())

CSV_DATA = load_csv_stocks()
PRICE_MAP = {s["symbol"]: s["price"] for s in CSV_DATA}

# ================= MARKET =================
def get_live_price_api(symbol):
    try:
        ticker = yf.Ticker(symbol + ".NS")
        hist = ticker.history(period="1d")
        if not hist.empty:
            return round(float(hist["Close"].iloc[-1]), 2)
    except:
        pass

    try:
        r = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": ALPHA_VANTAGE_KEY
            },
            timeout=6
        )
        data = r.json().get("Global Quote", {})
        price = float(data.get("05. price", 0))
        if price > 0:
            return price
    except:
        pass

    return 0

# ================= API =================
@app.route("/api/stocks")
def stocks():
    return jsonify(CSV_DATA)

# ================= AI QUERY =================
@app.route("/api/ai-query", methods=["POST"])
@token_required
def ai():
    text = request.json["query"].lower()

    # ========= VECTOR SEARCH (FIXED PROPERLY) =========
    if len(text.split()) > 1 and not text.isupper():
        results = semantic_search(text, top_k=30)

        found = {}

        for r in results:
            symbol = r.get("symbol", "").upper()
            if not symbol:
                continue

            # ✅ DO NOT DROP SYMBOLS
            price = PRICE_MAP.get(symbol)
            found[symbol] = price

        # Separate priced & unpriced
        priced = {k: v for k, v in found.items() if v is not None}
        unpriced = [k for k, v in found.items() if v is None]

        if any(k in text for k in ["high", "expensive", "costly"]):
            ordered = sorted(priced.items(), key=lambda x: x[1], reverse=True)
        else:
            ordered = sorted(priced.items(), key=lambda x: x[1])

        # take top 5, fill with unpriced if needed
        final = ordered[:5]
        for sym in unpriced:
            if len(final) >= 5:
                break
            final.append((sym, "N/A"))

        formatted = [
            f"• {sym} – ₹{price}" if price != "N/A" else f"• {sym} – Price N/A"
            for sym, price in final
        ]

        return jsonify({
            "price": "--",
            "analysis": (
                "📊 Stocks Matching Your Query\n\n"
                + ("\n".join(formatted) if formatted else "No matching stocks found.")
                
            )
        })
    # ================================================

    if "alert me" in text:
        conn = get_connection()
        cur = conn.cursor()

        m = re.search(r"(\w+).*?(above|below)\s*(\d+)", text)
        if m:
            symbol = m.group(1).upper()
            condition = "ABOVE" if m.group(2) == "above" else "BELOW"
            target = float(m.group(3))

            cur.execute("""
                INSERT INTO alerts (user_id, symbol, condition, target_price)
                VALUES (%s,%s,%s,%s)
            """, (request.user_id, symbol, condition, target))
            conn.commit()
            conn.close()

            return jsonify({
                "price": "--",
                "analysis": f"🔔 Alert created for {symbol} {condition} ₹{target}"
            })

    symbol = request.json["query"].upper()
    price = get_live_price_api(symbol)

    return jsonify({
        "price": price,
        "analysis": f"""
📊 Stock Analysis: {symbol}
• Price: ₹{price}
• Trend: Stable
• Outlook: Long-term bullish
""".strip()
    })
# ================= ALERT CHECK =================
# ================= ALERT CHECK =================
@app.route("/api/alerts/check")
@token_required
def check_alerts():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, symbol, condition, target_price
        FROM alerts
        WHERE user_id=%s AND is_active=true
    """, (request.user_id,))

    alerts = cur.fetchall()
    triggered = []

    for a_id, symbol, cond, target in alerts:
        price = get_live_price_api(symbol)

        # skip invalid prices
        if price == 0:
            continue

        if cond == "ABOVE" and price > target:
            triggered.append({
                "symbol": symbol,
                "condition": cond,
                "target": target,
                "price": price
            })

            cur.execute("""
                UPDATE alerts
                SET is_active=false, triggered_at=NOW()
                WHERE id=%s
            """, (a_id,))

        elif cond == "BELOW" and price < target:
            triggered.append({
                "symbol": symbol,
                "condition": cond,
                "target": target,
                "price": price
            })

            cur.execute("""
                UPDATE alerts
                SET is_active=false, triggered_at=NOW()
                WHERE id=%s
            """, (a_id,))

    conn.commit()
    conn.close()

    return jsonify({"alerts": triggered})

# ================= INTRADAY =================
@app.route("/api/alerts/intraday")
@token_required
def intraday_alerts():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT symbol FROM alerts
        WHERE user_id=%s AND is_active=true
    """, (request.user_id,))
    symbols = [r[0] for r in cur.fetchall()]

    triggered = []

    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol + ".NS")
            hist = ticker.history(period="1d")
            if hist.empty:
                continue

            high = hist["High"].max()
            low = hist["Low"].min()
            current = hist["Close"].iloc[-1]

            if current >= high:
                triggered.append(f"📈 {symbol} crossed DAY HIGH ₹{round(high,2)}")
            elif current <= low:
                triggered.append(f"📉 {symbol} broke DAY LOW ₹{round(low,2)}")
        except:
            continue

    conn.close()
    return jsonify({"alerts": triggered})

# ================= AUTH =================
@app.route("/api/signup", methods=["POST"])
def signup():
    d = request.json
    h = hashlib.sha256(d["password"].encode()).hexdigest()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username,email,password_hash) VALUES (%s,%s,%s)",
        (d["username"], d["email"], h)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Signup successful"})

@app.route("/api/login", methods=["POST"])
def login():
    d = request.json
    h = hashlib.sha256(d["password"].encode()).hexdigest()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id,username,password_hash FROM users WHERE email=%s",
        (d["email"],)
    )
    u = cur.fetchone()
    conn.close()

    if not u or u[2] != h:
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"user_id": u[0], "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)},
        SECRET_KEY,
        algorithm="HS256"
    )
    return jsonify({"token": token, "username": u[1]})
def get_user_email(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None

# ================= HISTORY =================
@app.route("/api/history/<symbol>")
def yahoo_history(symbol):
    ticker = yf.Ticker(symbol + ".NS")
    hist = ticker.history(period="5y")

    return jsonify({
        "labels": hist.index.strftime("%Y").tolist(),
        "prices": hist["Close"].round(2).tolist()
    })

if __name__ == "__main__":
    app.run(debug=True)
