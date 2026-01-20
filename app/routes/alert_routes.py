from fastapi import APIRouter

router = APIRouter()
alerts = []

@router.post("/alerts")
def add_alert(alert: dict):
    alerts.append(alert)
    return {"status": "alert added"}

@router.get("/alerts")
def get_alerts():
    return alerts
