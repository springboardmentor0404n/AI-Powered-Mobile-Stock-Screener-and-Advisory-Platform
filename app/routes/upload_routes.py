from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.security import get_current_user
from app.state import app_state
from app.utils.file_parser import parse_csv_excel_to_df, extract_text_from_pdf

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    content = await file.read()

    if file.content_type == "application/pdf":
        extract_text_from_pdf(content)
        return {"message": "PDF uploaded"}

    if file.filename.endswith((".csv", ".xlsx")):
        raw_df, numeric_df, cols = parse_csv_excel_to_df(content)

        app_state["raw_df"] = raw_df
        app_state["numeric_df"] = numeric_df
        app_state["columns"] = cols

        # initialize once
        app_state.setdefault("watchlist", set())
        app_state.setdefault("portfolio", [])

        return {"message": "File uploaded", "rows": len(raw_df)}

    raise HTTPException(400, "Unsupported file type")
