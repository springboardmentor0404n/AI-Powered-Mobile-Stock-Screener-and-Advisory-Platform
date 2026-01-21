from fastapi import APIRouter, HTTPException, Depends, Header, status, Query, Body
from typing import Optional, List, Any
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from admin_middleware import AdminAuth
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

# This will be set by the main app
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

# ============================================================================
# 1. USER & ACCESS MANAGEMENT
# ============================================================================

@router.get("/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all users with filters (Admin only)"""
    try:
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection not initialized"
            )
        
        query = {}
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active
        
        users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
        total = await db.users.count_documents(query)
        
        # Remove sensitive data
        for user in users:
            user["_id"] = str(user["_id"])
            user.pop("hashed_password", None)
        
        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ADMIN_USERS] Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching users: {str(e)}"
        )

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    authorization: Optional[str] = Header(None)
):
    """Update user role (requires super admin)"""
    # TODO: Add super admin auth
    valid_roles = ["user", "moderator", "admin", "super_admin"]
    if role not in valid_roles:
        raise HTTPException(400, f"Invalid role. Must be one of: {valid_roles}")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    return {"message": "Role updated successfully"}

@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    reason: str,
    authorization: Optional[str] = Header(None)
):
    """Ban/suspend a user"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_banned": True,
                "is_active": False,
                "ban_reason": reason,
                "banned_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    # Log ban action
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "action": "user_banned",
        "details": {"reason": reason},
        "created_at": datetime.utcnow()
    })
    
    return {"message": "User banned successfully"}

@router.patch("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    authorization: Optional[str] = Header(None)
):
    """Unban a user"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_banned": False,
                "is_active": True
            },
            "$unset": {"ban_reason": "", "banned_at": ""}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    return {"message": "User unbanned successfully"}

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    authorization: Optional[str] = Header(None)
):
    """Get user activity logs"""
    logs = await db.activity_logs.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {"logs": logs}

@router.patch("/users/{user_id}/rate-limit")
async def update_rate_limit(
    user_id: str,
    api_rate_limit: int,
    authorization: Optional[str] = Header(None)
):
    """Update API rate limit for user"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"api_rate_limit": api_rate_limit}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    
    return {"message": "Rate limit updated successfully"}

# ============================================================================
# 2. LLM & QUERY CONTROL
# ============================================================================

@router.get("/queries")
async def get_all_queries(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None,
    success: Optional[bool] = None,
    authorization: Optional[str] = Header(None)
):
    """Get all natural language queries"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if success is not None:
        query["success"] = success
    
    queries = await db.query_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.query_logs.count_documents(query)
    
    for q in queries:
        q["_id"] = str(q["_id"])
    
    return {
        "queries": queries,
        "total": total
    }

@router.get("/queries/stats")
async def get_query_stats(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get query statistics"""
    since = datetime.utcnow() - timedelta(days=days)
    
    total_queries = await db.query_logs.count_documents({"created_at": {"$gte": since}})
    successful_queries = await db.query_logs.count_documents({"created_at": {"$gte": since}, "success": True})
    failed_queries = await db.query_logs.count_documents({"created_at": {"$gte": since}, "success": False})
    
    # Token usage
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": None, "total_tokens": {"$sum": "$token_usage"}}}
    ]
    token_result = await db.query_logs.aggregate(pipeline).to_list(1)
    total_tokens = token_result[0]["total_tokens"] if token_result else 0
    
    return {
        "total_queries": total_queries,
        "successful_queries": successful_queries,
        "failed_queries": failed_queries,
        "success_rate": (successful_queries / total_queries * 100) if total_queries > 0 else 0,
        "total_tokens": total_tokens
    }

@router.delete("/queries/{query_id}")
async def delete_query(
    query_id: str,
    authorization: Optional[str] = Header(None)
):
    """Delete/flag a dangerous query"""
    result = await db.query_logs.update_one(
        {"_id": ObjectId(query_id)},
        {"$set": {"flagged": True, "flagged_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Query not found")
    
    return {"message": "Query flagged successfully"}

# ============================================================================
# 3. SYSTEM HEALTH & MONITORING
# ============================================================================

@router.get("/health")
async def get_system_health(authorization: Optional[str] = Header(None)):
    """Get system health status"""
    services = []
    
    # Check MongoDB
    try:
        await db.command("ping")
        services.append({
            "service": "MongoDB",
            "status": "up",
            "last_check": datetime.utcnow()
        })
    except Exception as e:
        services.append({
            "service": "MongoDB",
            "status": "down",
            "error": str(e),
            "last_check": datetime.utcnow()
        })
    
    # TODO: Add more service checks (Redis, LLM API, Market Data API, etc.)
    
    return {"services": services}

@router.get("/metrics")
async def get_system_metrics(authorization: Optional[str] = Header(None)):
    """Get system metrics"""
    # User stats
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    banned_users = await db.users.count_documents({"is_banned": True})
    
    # Query stats (last 24h)
    since_24h = datetime.utcnow() - timedelta(hours=24)
    queries_24h = await db.query_logs.count_documents({"created_at": {"$gte": since_24h}})
    
    # Alert stats
    active_alerts = await db.alerts.count_documents({"is_active": True})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "banned": banned_users
        },
        "queries_24h": queries_24h,
        "active_alerts": active_alerts
    }

# ============================================================================
# 4. ALERTS MANAGEMENT
# ============================================================================

@router.get("/alerts")
async def get_all_alerts(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    authorization: Optional[str] = Header(None)
):
    """Get all alerts"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    alerts = await db.alerts.find(query).skip(skip).limit(limit).to_list(limit)
    
    for alert in alerts:
        alert["_id"] = str(alert["_id"])
    
    return {"alerts": alerts}

@router.patch("/alerts/pause-all")
async def pause_all_alerts(authorization: Optional[str] = Header(None)):
    """Emergency: Pause all alerts globally"""
    result = await db.alerts.update_many(
        {},
        {"$set": {"is_active": False, "paused_by_admin": True, "paused_at": datetime.utcnow()}}
    )
    
    return {"message": f"Paused {result.modified_count} alerts"}

@router.patch("/alerts/resume-all")
async def resume_all_alerts(authorization: Optional[str] = Header(None)):
    """Resume all alerts"""
    result = await db.alerts.update_many(
        {"paused_by_admin": True},
        {"$set": {"is_active": True}, "$unset": {"paused_by_admin": "", "paused_at": ""}}
    )
    
    return {"message": f"Resumed {result.modified_count} alerts"}

# ============================================================================
# 5. COMPLIANCE & LEGAL
# ============================================================================

@router.get("/disclaimer")
async def get_active_disclaimer():
    """Get active disclaimer"""
    disclaimer = await db.disclaimers.find_one({"is_active": True})
    if disclaimer:
        disclaimer["_id"] = str(disclaimer["_id"])
    return disclaimer

@router.post("/disclaimer")
async def create_disclaimer(
    content: str,
    version: str,
    authorization: Optional[str] = Header(None)
):
    """Create new disclaimer (super admin only)"""
    # Deactivate old disclaimers
    await db.disclaimers.update_many(
        {"is_active": True},
        {"$set": {"is_active": False}}
    )
    
    # Create new
    disclaimer = {
        "version": version,
        "content": content,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.disclaimers.insert_one(disclaimer)
    
    return {"message": "Disclaimer created", "id": str(result.inserted_id)}

# ============================================================================
# 6. ANALYTICS
# ============================================================================

@router.get("/analytics/dau-mau")
async def get_dau_mau(authorization: Optional[str] = Header(None)):
    """Get Daily Active Users and Monthly Active Users"""
    now = datetime.utcnow()
    
    # DAU - users active in last 24 hours
    dau = await db.users.count_documents({
        "last_login": {"$gte": now - timedelta(days=1)}
    })
    
    # MAU - users active in last 30 days
    mau = await db.users.count_documents({
        "last_login": {"$gte": now - timedelta(days=30)}
    })
    
    return {
        "dau": dau,
        "mau": mau,
        "timestamp": now
    }

@router.get("/analytics/top-stocks")
async def get_top_queried_stocks(
    limit: int = 10,
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get most queried stocks"""
    since = datetime.utcnow() - timedelta(days=days)
    
    # This would require analyzing query logs for stock symbols
    # Placeholder implementation
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": "$symbol", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    # Note: This assumes we have a symbols field in query_logs
    # You'll need to extract symbols from queries
    results = await db.query_logs.aggregate(pipeline).to_list(limit)
    
    return {"top_stocks": results}

# ============================================================================
# 7. CONTENT MODERATION
# ============================================================================

@router.get("/content/reports")
async def get_content_reports(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all content reports (Admin only)"""
    reports = await db.content_reports.find().skip(skip).limit(limit).to_list(limit)
    total = await db.content_reports.count_documents({})
    
    for report in reports:
        report["_id"] = str(report["_id"])
    
    return {"reports": reports, "total": total}

@router.delete("/content/{content_id}")
async def delete_content(
    content_id: str,
    reason: str,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Delete inappropriate content (Admin only)"""
    # Log the deletion
    await db.activity_logs.insert_one({
        "admin_id": str(current_user["_id"]),
        "action": "delete_content",
        "content_id": content_id,
        "reason": reason,
        "timestamp": datetime.utcnow()
    })
    
    # Delete from content collection
    result = await db.content.delete_one({"_id": ObjectId(content_id)})
    
    return {"deleted": result.deleted_count > 0}

@router.post("/keywords/ban")
async def ban_keyword(
    keyword: str,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Ban a keyword from being used (Super Admin only)"""
    await db.banned_keywords.insert_one({
        "keyword": keyword.lower(),
        "banned_by": str(current_user["_id"]),
        "banned_at": datetime.utcnow()
    })
    
    return {"message": f"Keyword '{keyword}' banned successfully"}

@router.delete("/keywords/ban/{keyword}")
async def unban_keyword(
    keyword: str,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Unban a keyword (Super Admin only)"""
    result = await db.banned_keywords.delete_one({"keyword": keyword.lower()})
    return {"deleted": result.deleted_count > 0}

@router.get("/keywords/banned")
async def get_banned_keywords(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all banned keywords (Admin only)"""
    keywords = await db.banned_keywords.find().to_list(1000)
    for kw in keywords:
        kw["_id"] = str(kw["_id"])
    return {"keywords": keywords}

@router.patch("/users/{user_id}/mute")
async def mute_user(
    user_id: str,
    duration_hours: int = 24,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Temporarily mute a user (Admin only)"""
    mute_until = datetime.utcnow() + timedelta(hours=duration_hours)
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"muted_until": mute_until}}
    )
    
    return {"message": f"User muted until {mute_until}"}

# ============================================================================
# 8. FEATURE FLAGS & ENVIRONMENT
# ============================================================================

@router.get("/features")
async def get_feature_flags(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all feature flags (Admin only)"""
    flags = await db.feature_flags.find().to_list(100)
    for flag in flags:
        flag["_id"] = str(flag["_id"])
    return {"flags": flags}

@router.post("/features")
async def create_feature_flag(
    name: str,
    enabled: bool = False,
    description: str = "",
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Create a new feature flag (Super Admin only)"""
    flag = {
        "name": name,
        "enabled": enabled,
        "description": description,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.feature_flags.insert_one(flag)
    flag["_id"] = str(result.inserted_id)
    
    return flag

@router.patch("/features/{flag_name}/toggle")
async def toggle_feature_flag(
    flag_name: str,
    enabled: bool,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Toggle a feature flag (Admin only)"""
    await db.feature_flags.update_one(
        {"name": flag_name},
        {
            "$set": {
                "enabled": enabled,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"name": flag_name, "enabled": enabled}

@router.delete("/features/{flag_name}")
async def delete_feature_flag(
    flag_name: str,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Delete a feature flag (Super Admin only)"""
    result = await db.feature_flags.delete_one({"name": flag_name})
    return {"deleted": result.deleted_count > 0}

# ============================================================================
# 9. MARKET DATA MANAGEMENT
# ============================================================================

@router.get("/market-data/providers")
async def get_data_providers(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get status of all market data providers (Admin only)"""
    providers = await db.data_providers.find().to_list(10)
    for provider in providers:
        provider["_id"] = str(provider["_id"])
    return {"providers": providers}

@router.post("/market-data/refresh")
async def manual_data_refresh(
    symbol: Optional[str] = None,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Manually trigger data refresh (Admin only)"""
    # Log the manual refresh
    await db.activity_logs.insert_one({
        "admin_id": str(current_user["_id"]),
        "action": "manual_data_refresh",
        "symbol": symbol,
        "timestamp": datetime.utcnow()
    })
    
    # Trigger refresh (implementation depends on your data pipeline)
    return {"message": f"Refresh triggered for {symbol or 'all symbols'}"}

@router.patch("/market-data/provider/{provider_name}/toggle")
async def toggle_data_provider(
    provider_name: str,
    enabled: bool,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Enable/disable a data provider (Super Admin only)"""
    await db.data_providers.update_one(
        {"name": provider_name},
        {
            "$set": {
                "enabled": enabled,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"provider": provider_name, "enabled": enabled}

@router.patch("/market-data/provider/{provider_name}/priority")
async def set_provider_priority(
    provider_name: str,
    priority: int,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Set fallback priority for data provider (Super Admin only)"""
    await db.data_providers.update_one(
        {"name": provider_name},
        {"$set": {"priority": priority}}
    )
    
    return {"provider": provider_name, "priority": priority}

# ============================================================================
# 10. SUPER ADMIN TOOLS
# ============================================================================

@router.get("/system/config")
async def get_system_config(
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Get system configuration (Super Admin only)"""
    config = await db.system_config.find_one({})
    if config:
        config["_id"] = str(config["_id"])
    return config or {}

@router.patch("/system/config")
async def update_system_config(
    config_key: str,
    config_value: Any = Body(...),
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Update system configuration (Super Admin only)"""
    await db.system_config.update_one(
        {},
        {
            "$set": {
                config_key: config_value,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"key": config_key, "value": config_value}

@router.get("/system/logs")
async def get_system_logs(
    level: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Get system logs (Super Admin only)"""
    query = {}
    if level:
        query["level"] = level
    
    logs = await db.system_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {"logs": logs}

@router.post("/system/backup")
async def trigger_backup(
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Trigger system backup (Super Admin only)"""
    backup_id = str(ObjectId())
    
    await db.activity_logs.insert_one({
        "admin_id": str(current_user["_id"]),
        "action": "trigger_backup",
        "backup_id": backup_id,
        "timestamp": datetime.utcnow()
    })
    
    # Trigger backup process (implementation depends on your backup strategy)
    return {"message": "Backup triggered", "backup_id": backup_id}

@router.get("/system/costs")
async def get_system_costs(
    days: int = 30,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Get system costs breakdown (Super Admin only)"""
    since = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate costs from various sources
    costs = {
        "llm_api_calls": 0,
        "data_provider_calls": 0,
        "storage": 0,
        "compute": 0,
        "total": 0
    }
    
    # Calculate from usage logs
    # This is a placeholder - implement based on your cost tracking
    
    return {"costs": costs, "period_days": days}

@router.patch("/system/costs/limit")
async def set_cost_limit(
    service: str,
    limit: float,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Set cost limits for services (Super Admin only)"""
    await db.system_config.update_one(
        {},
        {
            "$set": {
                f"cost_limits.{service}": limit,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"service": service, "limit": limit}

# ============================================================================
# 11. LLM CONTROL ADVANCED
# ============================================================================

@router.get("/llm/models")
async def get_llm_models(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all configured LLM models (Admin only)"""
    models = await db.llm_models.find().to_list(50)
    for model in models:
        model["_id"] = str(model["_id"])
    return {"models": models}

@router.patch("/llm/models/{model_id}/toggle")
async def toggle_llm_model(
    model_id: str,
    enabled: bool,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Enable/disable an LLM model (Admin only)"""
    await db.llm_models.update_one(
        {"_id": ObjectId(model_id)},
        {"$set": {"enabled": enabled}}
    )
    
    return {"model_id": model_id, "enabled": enabled}

@router.get("/llm/prompts")
async def get_llm_prompts(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get all prompt templates (Admin only)"""
    prompts = await db.llm_prompts.find().to_list(100)
    for prompt in prompts:
        prompt["_id"] = str(prompt["_id"])
    return {"prompts": prompts}

@router.patch("/llm/prompts/{prompt_id}")
async def update_llm_prompt(
    prompt_id: str,
    template: str,
    current_user: dict = Depends(AdminAuth.require_super_admin)
):
    """Update a prompt template (Super Admin only)"""
    await db.llm_prompts.update_one(
        {"_id": ObjectId(prompt_id)},
        {
            "$set": {
                "template": template,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"prompt_id": prompt_id, "updated": True}

@router.get("/llm/rate-limits")
async def get_llm_rate_limits(
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Get LLM rate limits by endpoint (Admin only)"""
    limits = await db.llm_rate_limits.find().to_list(50)
    for limit in limits:
        limit["_id"] = str(limit["_id"])
    return {"rate_limits": limits}

@router.patch("/llm/rate-limits/{endpoint}")
async def update_llm_rate_limit(
    endpoint: str,
    requests_per_minute: int,
    current_user: dict = Depends(AdminAuth.require_admin)
):
    """Update rate limit for LLM endpoint (Admin only)"""
    await db.llm_rate_limits.update_one(
        {"endpoint": endpoint},
        {
            "$set": {
                "requests_per_minute": requests_per_minute,
                "updated_by": str(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"endpoint": endpoint, "requests_per_minute": requests_per_minute}
