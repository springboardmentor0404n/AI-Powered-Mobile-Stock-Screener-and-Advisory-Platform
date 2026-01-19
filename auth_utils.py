import bcrypt, random, os
from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def hash_password(p): 
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p, h): 
    return bcrypt.checkpw(p.encode(), h.encode())

def generate_otp(): 
    return str(random.randint(100000, 999999))

def create_access_token(email):
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
