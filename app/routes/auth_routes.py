from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.models import User
from app.auth import hash_password, verify_password, create_access_token, generate_otp
from app.email import send_otp_email
from app.database import get_db 

router = APIRouter()


# ================= SCHEMAS =================

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class VerifyOTP(BaseModel):
    email: str
    otp: str


# ================= REGISTER =================

@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = generate_otp()

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        otp=otp,
        is_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    await send_otp_email(user.email, otp)

    return {"message": "OTP sent to email"}


# ================= VERIFY OTP =================

@router.post("/verify-otp")
def verify_otp(data: VerifyOTP, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user.is_verified = True
    user.otp = None
    db.commit()

    return {"message": "Account verified"}


# ================= LOGIN =================

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not db_user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({"sub": db_user.email})
    return {"access_token": token}
