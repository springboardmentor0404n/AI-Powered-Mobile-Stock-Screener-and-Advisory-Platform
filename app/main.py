from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

# ---------------- DATABASE ----------------
from app.database import Base, engine, SessionLocal

# ---------------- STATE & UTILS ----------------
from app.state import app_state
from app.utils.file_parser import parse_csv_excel_to_df

# ---------------- ALERTS ----------------
from app.alerts.routes import router as alerts_router
from app.alerts.alert_engine import check_new_stocks, check_price_drop

# ---------------- ROUTERS ----------------
from app.routes.auth_routes import router as auth_router
from app.routes.upload_routes import router as upload_router
from app.routes.ai_routes import router as ai_router
from app.routes.protected import router as protected_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.user_market_routes import router as market_router
from app.routes.live_market_routes import router as live_market_router
from app.routes.portfolio_routes import router as portfolio_router
from app.routes.portfolio_routes import router as portfolio_router


# ---------------- APP ----------------
app = FastAPI()
scheduler = BackgroundScheduler()

Base.metadata.create_all(bind=engine)

# ---------------- STATIC FILES ----------------
static_dir = Path("app/static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- ROUTES ----------------
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(upload_router, prefix="/files", tags=["Files"])
app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(protected_router, prefix="/protected", tags=["Protected"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(market_router, prefix="/market", tags=["Market"])
app.include_router(live_market_router, prefix="/market", tags=["Live Market"])
app.include_router(
    portfolio_router,
    prefix="/portfolio",
    tags=["Portfolio"]
)
app.include_router(alerts_router, prefix="/alerts")





# ---------------- STARTUP: LOAD DEFAULT DATA ----------------
@app.on_event("startup")
def load_default_dataset():
    default_file = "uploaded_files/default_stocks.csv"

    print("🔄 Loading default dataset...")

    if not os.path.exists(default_file):
        print(f"❌ Default dataset NOT FOUND: {default_file}")
        return

    with open(default_file, "rb") as f:
        content = f.read()

    raw_df, numeric_df, cols = parse_csv_excel_to_df(content)

    if numeric_df.empty:
        print("❌ Default dataset has no numeric data")
        return

    app_state["raw_df"] = raw_df
    app_state["numeric_df"] = numeric_df
    app_state["columns"] = cols
    app_state["source"] = "default"

    print("✅ Default dataset loaded")
    print(f"Rows: {len(numeric_df)}")

    # ✅ THIS BLOCK MUST BE INSIDE THE FUNCTION
    symbol_col = raw_df.columns[0]

    if "known_symbols" not in app_state:
        app_state["known_symbols"] = set(raw_df[symbol_col].astype(str))

    symbol_col = raw_df.columns[0]
    app_state["known_symbols"] = set(raw_df[symbol_col].astype(str))


    print("✅ Default dataset loaded")
    print(f"Rows: {len(numeric_df)}")

# ---------------- STARTUP: ALERT SCHEDULER ----------------
def job():
    print("⏰ ALERT JOB RUNNING")
    db = SessionLocal()
    try:
        test_alert(db)   # <-- TEMP TEST
    finally:
        db.close()


    scheduler.add_job(job, "interval", minutes=1)
    scheduler.start()

    from app.database import SessionLocal
from app.alerts.alert_engine import create_alert

db = SessionLocal()
create_alert(db, "🧪 Test alert from shell")
db.close()