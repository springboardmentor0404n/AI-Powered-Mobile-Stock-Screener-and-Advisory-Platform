# watchlist_api.py
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

# --------------------------
# Database connection
# --------------------------
def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="stock_data",
        user="postgres",
        password="rishitha",
        cursor_factory=RealDictCursor
    )

# --------------------------
# Watchlist routes
# --------------------------
@app.route("/")
def index():
    return "Watchlist API is running!"

@app.route("/get_watchlist/<username>", methods=["GET"])
def get_watchlist(username):
    """Fetch all symbols in the user's watchlist"""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT symbol FROM watchlist WHERE username = %s",
        (username,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "watchlist": [r["symbol"] for r in rows]
    }), 200

@app.route("/add_to_watchlist", methods=["POST"])
def add_to_watchlist():
    """Add a single symbol to the watchlist"""
    data = request.json
    username = data.get("username")
    symbol = data.get("symbol")

    if not username or not symbol:
        return jsonify({"msg": "Username and symbol required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO watchlist (username, symbol)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
    """, (username, symbol))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"msg": f"{symbol} added to watchlist"}), 201

@app.route("/add_multiple_to_watchlist", methods=["POST"])
def add_multiple_to_watchlist():
    """Add multiple symbols to the watchlist"""
    data = request.json
    username = data.get("username")
    symbols = data.get("symbols")  # List of symbols

    if not username or not symbols:
        return jsonify({"msg": "Username and symbols required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        for symbol in symbols:
            cur.execute("""
                INSERT INTO watchlist (username, symbol)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
            """, (username, symbol))
        conn.commit()
        return jsonify({"msg": "Symbols added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/add_all_symbols", methods=["POST"])
def add_all_symbols():
    """Add all symbols from cleaned_stock_data to the user's watchlist"""
    data = request.json
    username = data.get("username")

    if not username:
        return jsonify({"msg": "Username required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO watchlist (username, symbol)
            SELECT DISTINCT %s, symbol
            FROM cleaned_stock_data
            ON CONFLICT DO NOTHING
        """, (username,))
        conn.commit()
        return jsonify({"msg": "All symbols added to watchlist"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/remove_from_watchlist", methods=["POST"])
def remove_from_watchlist():
    """Remove a symbol from the watchlist"""
    data = request.json
    username = data.get("username")
    symbol = data.get("symbol")

    if not username or not symbol:
        return jsonify({"msg": "Username and symbol required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM watchlist
        WHERE username = %s AND symbol = %s
    """, (username, symbol))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"msg": f"{symbol} removed"}), 200

# --------------------------
# Stock metrics route (for dashboard charts)
# --------------------------
@app.route("/get_stock_metrics/<symbol>", methods=["GET"])
def get_stock_metrics(symbol):
    """Fetch stock metrics for visualization (OHLC, volume, profit margin)"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                timestamp,
                open,
                high,
                low,
                close,
                tottrdqty AS volume,
                profit_margin
            FROM cleaned_stock_data
            WHERE symbol = %s
            ORDER BY timestamp
        """, (symbol,))

        rows = cur.fetchall()
        if not rows:
            return jsonify([]), 200

        # Format data
        data = []
        for r in rows:
            data.append({
                "timestamp": r["timestamp"].isoformat() if r["timestamp"] else None,
                "open": r["open"],
                "high": r["high"],
                "low": r["low"],
                "close": r["close"],
                "volume": r["volume"],
                "profit_margin": r["profit_margin"]
            })

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --------------------------
# Run server
# --------------------------
if __name__ == "__main__":
    app.run(debug=True)
