import pandas as pd
from io import BytesIO
from PyPDF2 import PdfReader

# ================= CSV / EXCEL PARSER =================
def parse_csv_excel_to_df(file_bytes: bytes):
    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception:
        df = pd.read_excel(BytesIO(file_bytes))

    # normalize column names
    df.columns = df.columns.str.lower().str.strip()

    # find symbol column
    symbol_col = None
    for col in ["symbol", "stock", "ticker"]:
        if col in df.columns:
            symbol_col = col
            break

    if symbol_col is None:
        raise ValueError("CSV must contain symbol / stock / ticker column")

    # rename and normalize symbol
    df = df.rename(columns={symbol_col: "symbol"})
    df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()

    numeric_df = df.copy()

    for col in ["open", "close", "price", "volume"]:
        if col in numeric_df.columns:
            numeric_df[col] = pd.to_numeric(numeric_df[col], errors="coerce")

    return df, numeric_df, df.columns.tolist()


# ================= PDF TEXT EXTRACTOR =================
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    return text.strip()
