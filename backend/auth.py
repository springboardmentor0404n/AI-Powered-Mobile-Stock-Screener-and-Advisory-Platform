from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import User
from schemas import UserCreate, Token, UserResponse, TokenData
import os

import bcrypt

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day for dev

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain_password, hashed_password):
    # bcrypt.checkpw requires bytes
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    # bcrypt.hashpw returns bytes, we decode to string for storage
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Legacy/Direct Signup (kept for testing but UI will use OTP)
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

from utils_email import send_email_otp, generate_otp, otp_storage
from schemas import OTPRequest, VerifySignupRequest, OTPValidateRequest
import hashlib
import time

MAX_OTP_ATTEMPTS = 3
OTP_EXPIRY_SECONDS = 300 # 5 minutes

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

from fastapi import BackgroundTasks

@router.post("/send-otp")
async def send_otp(request: OTPRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate & Store Securely
    plain_otp = generate_otp()
    otp_hash = hash_otp(plain_otp)
    
    otp_storage[request.email] = {
        "hash": otp_hash,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "attempts": 0
    }
    
    # Send Email in Background (Instant Response)
    background_tasks.add_task(send_email_otp, request.email, plain_otp)
         
    return {"message": "OTP sent"}

@router.post("/validate-otp")
async def validate_otp(request: OTPValidateRequest):
    # Magic OTP for Dev/Skip
    if request.otp == "000000":
        return {"message": "OTP Valid (Dev)"}

    record = otp_storage.get(request.email)
    if not record:
        raise HTTPException(status_code=400, detail="OTP expired or not sent")

    # Check Expiry
    if time.time() > record["expires_at"]:
        del otp_storage[request.email]
        raise HTTPException(status_code=400, detail="OTP expired")

    # Check Attempts
    if record["attempts"] >= MAX_OTP_ATTEMPTS:
        del otp_storage[request.email]
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request new OTP.")

    # Validate Hash
    if hash_otp(request.otp) != record["hash"]:
        record["attempts"] += 1
        otp_storage[request.email] = record # Update count
        raise HTTPException(status_code=400, detail="Invalid OTP")

    return {"message": "OTP Valid"}

@router.post("/verify-signup", response_model=Token)
async def verify_signup(request: VerifySignupRequest, db: AsyncSession = Depends(get_db)):
    # Verify OTP (skip if magic 000000)
    if request.otp != "000000":
        record = otp_storage.get(request.email)
        if not record:
            raise HTTPException(status_code=400, detail="OTP expired or not sent")
            
        if time.time() > record["expires_at"]:
            del otp_storage[request.email]
            raise HTTPException(status_code=400, detail="OTP expired")
            
        if hash_otp(request.otp) != record["hash"]:
            record["attempts"] += 1
            if record["attempts"] >= MAX_OTP_ATTEMPTS:
                del otp_storage[request.email]
                raise HTTPException(status_code=429, detail="Too many failed attempts")
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Create User
    hashed_pw = get_password_hash(request.password)
    # Use full_name provided in request
    user = User(email=request.email, hashed_password=hashed_pw, full_name=request.full_name)
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        
        # Cleanup OTP
        if request.email in otp_storage:
            del otp_storage[request.email]
        
        # Auto Login (Generate Token)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        await db.rollback()
        print(f"User create failed: {e}")
        raise HTTPException(status_code=400, detail="User create failed")

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
