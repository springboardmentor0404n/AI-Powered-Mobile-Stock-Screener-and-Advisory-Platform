from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.deps import get_db
from app.database import Alert

router = APIRouter()

@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": a.id,
            "message": a.message,
            "is_read": a.is_read,
            "created_at": a.created_at
        }
        for a in alerts
    ]

@router.get("/unread/count")
def unread_count(db: Session = Depends(get_db)):
    count = db.query(Alert).filter(Alert.is_read == False).count()
    return {"count": count}

@router.post("/read/{alert_id}")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {"error": "Not found"}
    alert.is_read = True
    db.commit()
    return {"status": "ok"}
