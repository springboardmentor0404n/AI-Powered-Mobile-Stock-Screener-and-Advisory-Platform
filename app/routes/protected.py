from fastapi import APIRouter, Header, HTTPException
from ..auth import verify_token

router = APIRouter()

@router.get("/")
def protected_route(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"message": f"Welcome {payload['sub']}! This is protected data."}
