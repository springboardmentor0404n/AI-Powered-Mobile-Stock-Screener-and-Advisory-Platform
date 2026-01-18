# ---- ALERT BASELINE STATE ----
last_snapshot = {}
baseline_initialized = False

from flask import Flask, request, jsonify, render_template
import jwt
import datetime
import os
import re
import time

from db import get_connection
from sentence_transformers import SentenceTransformer
from google import genai

from dotenv import load_dotenv
load_dotenv()  # Load .env variables


app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback-dev-key')

JWT_SECRET = "ba3dcd1c8a2d8ad6e79f309d9ee9d48470e9395a03adb966cf2d76a263391531"

# ---------------- EMBEDDING MODEL ----------------
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------- GEMINI CONFIG ----------------
os.environ["GEMINI_API_KEY"] = "AIzaSyCQsDAwsKZcYGc7ANwjzEDSuPidFiPhOFA"
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from authlib.integrations.flask_client import OAuth
import os

# OAuth setup 
oauth = OAuth(app)

# Google OAuth
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    access_token_url='https://oauth2.googleapis.com/token',  
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration', 
    client_kwargs={'scope': 'openid email profile'}
)

# GitHub OAuth
github = oauth.register(
    name='github',
    client_id=os.getenv('GITHUB_CLIENT_ID', 'your-github-client-id'),
    client_secret=os.getenv('GITHUB_CLIENT_SECRET', 'your-github-secret'),
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'read:user user:email'}
)


# Google OAuth Routes
@app.route('/auth/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def google_callback():
    try:
        # Get access token
        token = google.authorize_access_token()
        
        # Use Google's userinfo endpoint DIRECTLY (no Authlib parsing)
        resp = google.get('https://www.googleapis.com/oauth2/v2/userinfo', token=token)
        user_info = resp.json()
        
        session['user'] = {
            'email': user_info['email'],
            'name': user_info.get('name', 'Google User'),
            'provider': 'google'
        }
        
        # saving credentials to authentication table
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT uname FROM authentication WHERE email=%s", (user_info['email'],))
        existing = cur.fetchone()
        if not existing:
            cur.execute(
                "INSERT INTO authentication (uname, email, password, phone_num) VALUES (%s, %s, %s, %s)",
                (user_info.get('name', 'oauth_user'), user_info['email'], 'not visible', 0)
            )
            conn.commit()
        cur.close()
        conn.close()
        
        return redirect(url_for('watchlist_page'))
        
    except Exception as e:
        print(f"GOOGLE ERROR: {e}")
        return jsonify({"error": f"Google login failed: {str(e)}"}), 400

@app.route('/auth/github')
def github_login():
    redirect_uri = url_for('github_callback', _external=True)
    return github.authorize_redirect(redirect_uri)

@app.route('/auth/github/callback')
def github_callback():
    try:
        # Get access token
        token = github.authorize_access_token()
        
        # Get user info
        resp = github.get('user', token=token)
        user_info = resp.json()
        
        session['user'] = {
            'email': user_info.get('email') or f"{user_info['login']}@github.com",
            'name': user_info.get('name') or user_info['login'],
            'provider': 'github'
        }
        
        # saving credentials to authentication table
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT uname FROM authentication WHERE email=%s", (session['user']['email'],))
        existing = cur.fetchone()
        if not existing:
            cur.execute(
                "INSERT INTO authentication (uname, email, password, phone_num) VALUES (%s, %s, %s, %s)",
                (session['user']['name'], session['user']['email'], 'not visible', 1)
            )
            conn.commit()
        cur.close()
        conn.close()
        
        return redirect(url_for('watchlist_page'))
        
    except Exception as e:
        print(f"GITHUB ERROR: {e}")
        return jsonify({"error": f"GitHub login failed: {str(e)}"}), 400


# Logout route
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))


import math

def norm(v):
    if v is None:
        return None
    return round(float(v), 6)

def safe_float(x):
    if x is None or math.isinf(x) or math.isnan(x):
        return None
    return float(x)

# ---------------- HOME ----------------
@app.route("/")
def home():
    return render_template("login.html")

@app.route("/debug/db")
def debug_db():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM watchlist_fundamentals")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return {"row_count": count}

#---------------- CHAT PAGE ----------------#
@app.route("/chat")
def chat_page():
    return render_template("chat.html")

# ======================= CHAT HELPERS =======================

def is_safe_select_sql(sql: str) -> bool:
    sql_l = sql.lower().strip()
    if not sql_l.startswith("select"):
        return False
    forbidden = ["delete", "update", "insert", "drop", "alter", "truncate"]
    return not any(word in sql_l for word in forbidden)


def generate_sql_from_question(question: str) -> str:
    prompt = f"""
You are a PostgreSQL SQL generator.

Table: watchlist_fundamentals (5829 rows)

Columns (ALL available):
symbol, revenue_per_share, trailing_pe, earnings_quarterly_growth, previous_close, 
open_price, day_low, day_high, volume, trailing_eps, peg_ratio, ebitda, 
total_debt, total_revenue, debt_to_equity, earnings_growth, revenue_growth

EXAMPLES:
"top 5 total debt" → SELECT symbol, total_debt FROM watchlist_fundamentals ORDER BY total_debt DESC LIMIT 5
"highest revenue" → SELECT symbol, total_revenue FROM watchlist_fundamentals ORDER BY total_revenue DESC LIMIT 5  
"avg pe ratio" → SELECT AVG(trailing_pe) as avg_pe FROM watchlist_fundamentals

RULES:
- ALWAYS generate SQL for ANY column mentioned
- Use ORDER BY column DESC LIMIT 5 for "top"/"highest"/"maximum"
- Use AVG() for averages
- NEVER return "NONE"

Question: {question}

SQL:"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        return response.text.strip()
    except Exception:
        return "NONE"


def explain_sql_result(question: str, rows: list) -> str:
    # SHOW ALL ROWS
    data_text = ""
    for r in rows: 
        data_text += ", ".join(f"{k}: {v}" for k, v in r.items()) + "\n"

    prompt = f"""
You are a financial assistant.

Answer the user's question using ONLY the data below.
Explain in simple, beginner friendly English.
Be detailed but clear.
Do NOT add extra facts.
Do NOT guess numbers.
List ALL companies and their exact values.

Data ({len(rows)} companies found):
{data_text}

Question:
{question}

Detailed Answer:
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        # FALLBACK: Raw data if Gemini fails
        return f"Found {len(rows)} companies:\n" + data_text[:2000]


# ======================= CHAT API =======================

@app.route("/ask", methods=["POST"])
def ask():
    try:
        user_question = request.json.get("question", "").strip()
        if not user_question:
            return jsonify({"answer": "Please ask a question."})

        print(f"🤖 Question: {user_question}")

        # ---------- STEP 1: TRY TEXT TO SQL ----------
        sql = generate_sql_from_question(user_question)
        print(f"🔍 Generated SQL: {sql}")

        if sql != "NONE" and is_safe_select_sql(sql):
            try:
                conn = get_connection()
                cur = conn.cursor()
                cur.execute(sql)
                cols = [d[0] for d in cur.description]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]
                cur.close()
                conn.close()
                
                print(f"📊 Found {len(rows)} rows")
                
                if rows:
                    answer = explain_sql_result(user_question, rows)
                    return jsonify({"answer": answer})
                    
            except Exception as e:
                print(f"SQL ERROR: {e}")
                return jsonify({"answer": f"Database error: {str(e)}"})

        # ---------- STEP 2: DYNAMIC RAG - ALL ROWS, ALL COLUMNS ----------
        print("📝 Falling back to RAG (ALL DATA)...")

        # 1. Get ALL columns dynamically
        conn = get_connection()
        cur = conn.cursor()

        # Get table schema
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'watchlist_fundamentals' 
            ORDER BY ordinal_position
        """)
        columns_info = cur.fetchall()
        all_columns = [row[0] for row in columns_info]
        print(f"📋 Found {len(all_columns)} columns: {all_columns}")

        # 2. Get ALL rows (no LIMIT)
        cur.execute(f"SELECT {', '.join(all_columns)} FROM watchlist_fundamentals ORDER BY symbol")
        all_rows = cur.fetchall()
        print(f"📊 Loaded {len(all_rows)} total rows")

        cur.close()
        conn.close()

        # 3. Smart context: Top values + aggregates for each numeric column
        context = "=== FULL DATASET SUMMARY ===\n"
        context += f"Total companies: {len(all_rows)}\n\n"

        numeric_cols = [col for col in all_columns if col != 'symbol']

        for col in numeric_cols[:10]:  # Top 10 metrics to fit token limit
            # Get top 5 values
            conn = get_connection()
            cur = conn.cursor()
            cur.execute(f"""
                SELECT symbol, {col} 
                FROM watchlist_fundamentals 
                WHERE {col} IS NOT NULL 
                ORDER BY {col} DESC NULLS LAST 
                LIMIT 5
            """)
            top_rows = cur.fetchall()
            
            context += f"🏆 TOP 5 {col.upper()}:\n"
            for r in top_rows:
                context += f"  {r[0]}: {r[1]}\n"
            
            # Aggregates
            cur.execute(f"SELECT AVG({col}), MAX({col}), MIN({col}) FROM watchlist_fundamentals")
            avg, maxv, minv = cur.fetchone()
            context += f"  AVG: {avg:.2f}, MAX: {maxv}, MIN: {minv}\n\n"
            
            cur.close()
            conn.close()

        # 4. Recent/alphabetical sample for reference
        context += "=== SAMPLE (first 5 companies alphabetically):\n"
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT {', '.join(['symbol'] + numeric_cols[:5])} FROM watchlist_fundamentals ORDER BY symbol LIMIT 5")
        sample_rows = cur.fetchall()
        for r in sample_rows:
            context += f"{r[0]}: " + ", ".join(f"{numeric_cols[i]}={r[i+1]}" for i in range(5) if r[i+1]) + "\n"
        cur.close()
        conn.close()

        prompt = f"""
        You are a financial assistant. Answer using ONLY this COMPLETE dataset summary.

        FULL DATASET ({len(all_rows)} companies, {len(all_columns)} columns):
        {context}

        Question: {user_question}

        Answer using the TOP values and aggregates shown above. List exact companies and numbers.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        return jsonify({"answer": response.text.strip()})

    except Exception as e:
        print(f"ASK ERROR: {e}")
        return jsonify({"answer": f"Server error."}), 500



# ---------------- LOGIN ----------------
@app.route("/login", methods=["GET"])
def show_login():
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT uname, password FROM authentication WHERE email=%s", (email,))
    user = cur.fetchone()

    if not user or password != user[1]:
        return jsonify({"message": "Invalid credentials"}), 400

    token = jwt.encode(
        {
            "uname": user[0],
            "email": email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    cur.close()
    conn.close()
    return jsonify({"token": token})

#--------------- SIGN UP PAGE ----------------#
@app.route("/signup", methods=["POST"])
def signup():
    username = request.form.get("username")
    password = request.form.get("password")
    email = request.form.get("email")
    phone_num = request.form.get("phone_num")

    if not all([username, password, email, phone_num]):
        return jsonify({"message": "All fields are required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    
    # ---- CHECK ALL DUPLICATES ----
    cur.execute("SELECT email FROM authentication WHERE email=%s", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"message": "Email already registered"}), 400
    
    cur.execute("SELECT uname FROM authentication WHERE uname=%s", (username,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"message": "Username already taken"}), 400
    
    cur.execute("SELECT phone_num FROM authentication WHERE phone_num=%s", (phone_num,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"message": "Phone number already registered"}), 400
    
    # Insert new user
    cur.execute(
        "INSERT INTO authentication (uname, password, email, phone_num) VALUES (%s, %s, %s, %s)",
        (username, password, email, phone_num)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({"message": "Account created successfully"}), 200

@app.route("/signup")
def signup_page():
    return render_template("signup.html")


# ---------------- WATCHLIST PAGE ----------------
@app.route("/watchlist")
def watchlist_page():
    return render_template("watchlist.html")
#-- portfolio---
@app.route("/portfolio")
def portfolio_page():
    return render_template("portfolio.html")
#market
@app.route("/market")
def market_page():
    return render_template("market.html")

#-----------------MARKET API----------------#
import requests

ALPHA_API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")


@app.route("/api/market-data")
def market_data():
    symbol = request.args.get("symbol", "NSEI")  # default index
    function = "TIME_SERIES_INTRADAY"
    interval = "60min"

    url = (
        f"https://www.alphavantage.co/query"
        f"?function={function}&symbol={symbol}"
        f"&interval={interval}&apikey={ALPHA_API_KEY}"
    )

    r = requests.get(url)
    if r.status_code != 200:
        return jsonify({"error": "Market API failed"}), 500

    data = r.json()
    return jsonify(data)


# ---------------- COMPANIES API ----------------
@app.route("/api/companies")
def get_companies():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT symbol
        FROM watchlist_fundamentals
        ORDER BY symbol
    """)

    companies = [r[0] for r in cur.fetchall()]
    cur.close()
    conn.close()

    return jsonify(companies)

@app.route("/api/data")
def data():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT symbol, open_price
        FROM watchlist_fundamentals
        ORDER BY symbol
        LIMIT 20
    """)
    rows = cur.fetchall()

    return jsonify({
        "symbols": [r[0] for r in rows],
        "values": [r[1] for r in rows]
    })
# ---------------- WATCHLIST DATA API ----------------
@app.route("/api/watchlist-data")
def watchlist_data():
    company = request.args.get("company", "All")

    conn = get_connection()
    cur = conn.cursor()

    # ---- KPI AVERAGES ----
    if company == "All":
        cur.execute("""
            SELECT
                COALESCE(AVG(open_price), 0),
                COALESCE(AVG(previous_close), 0),
                COALESCE(AVG(trailing_pe), 0),
                COALESCE(AVG(debt_to_equity), 0)
            FROM watchlist_fundamentals
        """)
    else:
        cur.execute("""
            SELECT
                COALESCE(AVG(open_price), 0),
                COALESCE(AVG(previous_close), 0),
                COALESCE(AVG(trailing_pe), 0),
                COALESCE(AVG(debt_to_equity), 0)
            FROM watchlist_fundamentals
            WHERE symbol = %s
        """, (company,))

    kpi = cur.fetchone()

    # ---- CHART DATA ----
    if company == "All":
        cur.execute("""
            SELECT
                symbol,
                COALESCE(open_price, 0),
                COALESCE(previous_close, 0),
                COALESCE(trailing_pe, 0),
                COALESCE(peg_ratio, 0),
                COALESCE(earnings_growth, 0),
                COALESCE(revenue_growth, 0),
                COALESCE(debt_to_equity, 0)
            FROM watchlist_fundamentals
            ORDER BY symbol
        """)
    else:
        cur.execute("""
            SELECT
                symbol,
                COALESCE(open_price, 0),
                COALESCE(previous_close, 0),
                COALESCE(trailing_pe, 0),
                COALESCE(peg_ratio, 0),
                COALESCE(earnings_growth, 0),
                COALESCE(revenue_growth, 0),
                COALESCE(debt_to_equity, 0)
            FROM watchlist_fundamentals
            WHERE symbol = %s
        """, (company,))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "avg_open": safe_float(kpi[0]),
        "avg_previous_close": safe_float(kpi[1]),
        "avg_trailing_pe": safe_float(kpi[2]),
        "avg_debt_to_equity": safe_float(kpi[3]),

        "symbols": [r[0] for r in rows],
        "open_price": [safe_float(r[1]) for r in rows],
        "previous_close": [safe_float(r[2]) for r in rows],
        "trailing_pe": [safe_float(r[3]) for r in rows],
        "peg_ratio": [safe_float(r[4]) for r in rows],
        "earnings_growth": [safe_float(r[5]) for r in rows],
        "revenue_growth": [safe_float(r[6]) for r in rows],
        "debt_to_equity": [safe_float(r[7]) for r in rows]
    })

#------------------ ALERTS ----------------#
from flask import Response
import json
import time
from collections import defaultdict

# Global storage for recent changes
recent_changes = []

@app.route("/api/alerts")
def alerts():
    def generate():
        print("📡 SSE client connected")
        global recent_changes
        last_count = 0
        while True:
            if len(recent_changes) > last_count:
                new_alerts = recent_changes[last_count:]
                for alert in new_alerts:
                    print(f"🔔 SENDING: {alert}")
                    yield f"data: {json.dumps(alert)}\n\n"
                last_count = len(recent_changes)
            time.sleep(1)
    return Response(generate(), mimetype="text/event-stream")

import threading
from copy import deepcopy

last_snapshot = {}
   # poll every 5 seconds

import threading
from copy import deepcopy

def poll_watchlist_changes():
    print("🔁 Watchlist poller STARTED")
    global last_snapshot, recent_changes, baseline_initialized
    
    while True:
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT
                symbol,
                open_price,
                previous_close,
                trailing_pe,
                peg_ratio,
                earnings_growth,
                revenue_growth,
                debt_to_equity,
                revenue_per_share,
                earnings_quarterly_growth,
                day_low,
                day_high,
                volume,
                trailing_eps,
                ebitda,
                total_debt,
                total_revenue
                FROM watchlist_fundamentals
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()

            print("🔁 Polling DB… rows:", len(rows))
            
            current = {
                r[0]: {
                    "open_price": norm(r[1]),
                    "previous_close": norm(r[2]),
                    "trailing_pe": norm(r[3]),
                    "peg_ratio": norm(r[4]),
                    "earnings_growth": norm(r[5]),
                    "revenue_growth": norm(r[6]),
                    "debt_to_equity": norm(r[7]),
                    "revenue_per_share": norm(r[8]),
                    "earnings_quarterly_growth": norm(r[9]),
                    "day_low": norm(r[10]),
                    "day_high": norm(r[11]),
                    "volume": norm(r[12]),
                    "trailing_eps": norm(r[13]),
                    "ebitda": norm(r[14]),
                    "total_debt": norm(r[15]),
                    "total_revenue": norm(r[16])
                }
                for r in rows
            }
            
            if not baseline_initialized:
                last_snapshot = deepcopy(current)
                baseline_initialized = True
                print("✅ Baseline snapshot initialized")
                time.sleep(5)
                continue
                
            # 1. NEW COMPANIES (current - last_snapshot)
            for symbol in current:
                if symbol not in last_snapshot:
                    recent_changes.append({"type": "new_company", "symbol": symbol})
                    print(f"🆕 NEW COMPANY: {symbol}")
            
            # 2. METRIC CHANGES
            for symbol, metrics in current.items():
                if symbol in last_snapshot:
                    for k, v in metrics.items():
                        old_v = norm(last_snapshot[symbol].get(k))
                        new_v = norm(v)
                        if old_v != new_v and old_v is not None and new_v is not None:
                            recent_changes.append({
                                "type": "metric_update", "symbol": symbol, 
                                "metric": k, "old": float(old_v), "new": float(new_v)
                            })
                            print(f"🔔 CHANGE: {symbol} {k} {old_v} → {new_v}")
            
            # 3. DELETED COMPANIES (last_snapshot - current)
            for symbol in list(last_snapshot.keys()):
                if symbol not in current:
                    recent_changes.append({"type": "company_deleted", "symbol": symbol})
                    print(f"🗑️ DELETED: {symbol}")
            
            # 4. UPDATE SNAPSHOT LAST
            last_snapshot = deepcopy(current)
            
        except Exception as e:
            print(f"❌ Poller ERROR: {e}")
        
        time.sleep(5)


#---------------- DEBUG ALERTS ----------------#

@app.route("/debug/alerts")
def debug_alerts():
    global recent_changes, last_snapshot
    return jsonify({
        "recent_changes_count": len(recent_changes),
        "recent_changes": recent_changes[-5:],  # Last 5
        "snapshot_count": len(last_snapshot),
        "poller_status": "running"
    })


# ---------------- RUN APP ----------------#
if __name__ == "__main__":
    threading.Thread(target=poll_watchlist_changes, daemon=True).start()
    app.run(port=3000, debug=False, use_reloader=False)
