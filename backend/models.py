from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# User Roles
class UserRole:
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

# User Model
class UserModel(BaseModel):
    name: str
    email: EmailStr
    hashed_password: str
    role: str = UserRole.USER
    is_active: bool = True
    is_banned: bool = False
    api_rate_limit: int = 100  # queries per day
    created_at: datetime
    last_login: Optional[datetime] = None

# Query Log Model
class QueryLog(BaseModel):
    user_id: str
    query: str
    parsed_dsl: Optional[dict] = None
    success: bool
    error_message: Optional[str] = None
    token_usage: Optional[int] = None
    execution_time_ms: int
    created_at: datetime

# Alert Model
class AlertModel(BaseModel):
    user_id: str
    symbol: str
    condition: str
    target_value: float
    is_active: bool = True
    last_triggered: Optional[datetime] = None
    created_at: datetime

# System Health Model
class SystemHealth(BaseModel):
    service_name: str
    status: str  # "up", "down", "degraded"
    last_check: datetime
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None

# Activity Log Model
class ActivityLog(BaseModel):
    user_id: str
    action: str
    details: dict
    ip_address: Optional[str] = None
    created_at: datetime

# Compliance Disclaimer Model
class DisclaimerModel(BaseModel):
    version: str
    content: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

# Notification Preferences Model
class NotificationPreference(BaseModel):
    user_id: int
    news_enabled: bool = True
    alerts_enabled: bool = True
    market_updates_enabled: bool = True
    expo_push_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime
