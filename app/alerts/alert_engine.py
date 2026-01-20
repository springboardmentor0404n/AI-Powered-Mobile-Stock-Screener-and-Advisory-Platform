from sqlalchemy.orm import Session
from app.database import Alert, SessionLocal
from app.state import app_state
import pandas as pd

PRICE_DROP_PERCENT = 5.0


def alert_exists(db: Session, message: str) -> bool:
    return db.query(Alert).filter(Alert.message == message).first() is not None


def create_alert(
    db: Session,
    message: str,
    alert_type: str = "system",
    symbol: str | None = None
):
    if alert_exists(db, message):
        return

    print("🚨 ALERT CREATED:", message)

    alert = Alert(
        symbol=symbol,
        alert_type=alert_type,
        message=message,
        is_read=False
    )
    db.add(alert)
    db.commit()


# ---------------------------
# NEW STOCK ALERT (GOOD AS-IS)
# ---------------------------
def check_new_stocks(db: Session):
    raw_df = app_state.get("raw_df")
    known = app_state.get("known_symbols", set())

    if raw_df is None:
        return

    symbol_col = raw_df.columns[0]
    current = set(raw_df[symbol_col].astype(str))

    new_symbols = current - known

    for symbol in new_symbols:
        create_alert(
            db,
            message=f"🆕 New stock added: {symbol}",
            alert_type="new_stock",
            symbol=symbol
        )

    app_state["known_symbols"] = current


# ---------------------------
# PRICE DROP ALERT (FIXED)
# ---------------------------
def check_price_drop(db: Session):
    df = app_state.get("numeric_df")
    raw_df = app_state.get("raw_df")

    if df is None or raw_df is None:
        return

    symbol_col = raw_df.columns[0]
    price_col = df.columns[0]

    prev_prices = app_state.get("prev_prices", {})

    for idx, row in df.iterrows():
        try:
            current_price = float(row[price_col])
        except Exception:
            continue

        if current_price <= 0:
            continue

        symbol = str(raw_df.iloc[idx][symbol_col])
        prev_price = prev_prices.get(symbol)

        if prev_price:
            drop_pct = ((prev_price - current_price) / prev_price) * 100

            if drop_pct >= PRICE_DROP_PERCENT:
                create_alert(
                    db,
                    message=(
                        f"📉 {symbol} dropped {drop_pct:.2f}% "
                        f"(₹{prev_price:.2f} → ₹{current_price:.2f})"
                    ),
                    alert_type="price_drop",
                    symbol=symbol
                )

        prev_prices[symbol] = current_price

    app_state["prev_prices"] = prev_prices


# ---------------------------
# MAIN JOB
# ---------------------------
def job():
    db = SessionLocal()
    try:
        check_new_stocks(db)
        check_price_drop(db)
    finally:
        db.close()
