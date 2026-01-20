from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from passlib.hash import pbkdf2_sha256
import psycopg2

app = Flask(__name__)

# JWT config
app.config["JWT_SECRET_KEY"] = "your_secret_key_here"
jwt = JWTManager(app)

# -----------------------------
# DATABASE CONNECTION
# -----------------------------
def get_db_connection():
    return psycopg2.connect(
        dbname="Backend",
        user="postgres",
        password="rishitha",
        host="localhost",
        port="5432"
    )

# -----------------------------
# HOME ROUTE (avoid 404 confusion)
# -----------------------------
@app.route("/", methods=["GET"])
def home():
    return "API is running"

# -----------------------------
# LOGIN ROUTE
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email_id = data.get("email_id")
    password = data.get("password")

    if not email_id or not password:
        return jsonify({"msg": "Missing email or password"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        'SELECT hashed_password FROM "Stock"."user" WHERE email_id = %s',
        (email_id,)
    )
    result = cur.fetchone()

    cur.close()
    conn.close()

    if result is None:
        return jsonify({"msg": "Invalid credentials"}), 401

    stored_hash = result[0]  # This is your pbkdf2 hash (string)

    # ✅ CORRECT VERIFICATION
    if pbkdf2_sha256.verify(password, stored_hash):
        access_token = create_access_token(identity=email_id)
        return jsonify({"access_token": access_token}), 200
    else:
        return jsonify({"msg": "Invalid credentials"}), 401

# -----------------------------
# PROTECTED ROUTE
# -----------------------------
@app.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    return jsonify({"msg": "Welcome to protected dashboard"}), 200

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
