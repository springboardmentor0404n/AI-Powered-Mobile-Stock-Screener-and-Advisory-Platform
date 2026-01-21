from fastapi import HTTPException, Header, status
from typing import Optional
import jwt
import os
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Global database reference (will be set by main app)
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

class AdminAuth:
    ADMIN_ROLES = ["admin", "super_admin"]
    SUPER_ADMIN_ROLE = "super_admin"
    
    @staticmethod
    def verify_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    @staticmethod
    async def require_admin(authorization: Optional[str] = Header(None)):
        """Middleware to require admin role"""
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        token = authorization.replace("Bearer ", "")
        payload = AdminAuth.verify_token(token)
        user_id = payload.get("user_id")
        
        # Get user from database
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check if user has admin role
        if user.get("role") not in AdminAuth.ADMIN_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return user
    
    @staticmethod
    async def require_super_admin(authorization: Optional[str] = Header(None)):
        """Middleware to require super admin role"""
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        token = authorization.replace("Bearer ", "")
        payload = AdminAuth.verify_token(token)
        user_id = payload.get("user_id")
        
        # Get user from database
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check if user has super admin role
        if user.get("role") != AdminAuth.SUPER_ADMIN_ROLE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin access required"
            )
        
        return user
