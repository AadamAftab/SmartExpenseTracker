from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.models import Transaction, ImportHistory, User
from schemas.schemas import ImportHistoryOut
from utils.auth import get_current_user
from datetime import datetime
import pandas as pd
import pdfplumber
import io
from utils.categorizer import categorize as smart_categorize

router = APIRouter(prefix="/imports", tags=["Imports"])

def is_duplicate(db: Session, user_id: int, amount: float, date: datetime, merchant: str) -> bool:
    existing = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.amount  == amount,
        Transaction.date    == date,
    ).first()
    return existing is not None

def parse_csv(contents: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(contents))
    df.columns = df.columns.str.strip().str.lower()

    col_map = {}

    for col in df.columns:
        if "date" in col:
            col_map["date"] = col
        elif "amount" in col or "debit" in col or "credit" in col:
            if "amount" not in col_map:
                col_map["amount"] = col
        elif "merchant" in col or "description" in col or "narration" in col or "particular" in col:
            col_map["merchant"] = col

    required = ["date", "amount"]
    for r in required:
        if r not in col_map:
            raise HTTPException(status_code=400, detail=f"CSV missing required column: {r}. Found columns: {list(df.columns)}")

    result = pd.DataFrame()
    result["date"]     = pd.to_datetime(df[col_map["date"]], dayfirst=True, errors="coerce")
    result["amount"]   = pd.to_numeric(df[col_map["amount"]].astype(str).str.replace(r"[^\d.\-]", "", regex=True), errors="coerce")
    result["merchant"] = df[col_map["merchant"]] if "merchant" in col_map else ""
    result = result.dropna(subset=["date", "amount"])
    return result

def parse_pdf(contents: bytes) -> pd.DataFrame:
    rows = []
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row and any(row):
                        rows.append(row)

    if not rows:
        raise HTTPException(status_code=400, detail="No tables found in PDF. Make sure it's a bank statement with transaction tables.")

    df = pd.DataFrame(rows)
    df = df.dropna(how="all")

    # Use first row as header if it looks like one
    first_row = df.iloc[0].astype(str).str.lower()
    if any(keyword in " ".join(first_row) for keyword in ["date", "amount", "debit", "credit"]):
        df.columns = first_row
        df = df.iloc[1:]

    df.columns = df.columns.astype(str).str.strip().str.lower()

    col_map = {}
    for col in df.columns:
        if "date" in col:
            col_map["date"] = col
        elif any(k in col for k in ["amount", "debit", "credit", "withdrawal"]):
            if "amount" not in col_map:
                col_map["amount"] = col
        elif any(k in col for k in ["description", "narration", "particular", "merchant", "detail"]):
            col_map["merchant"] = col

    if "date" not in col_map or "amount" not in col_map:
        raise HTTPException(status_code=400, detail=f"Could not find date/amount columns in PDF. Found: {list(df.columns)}")

    result = pd.DataFrame()
    result["date"]     = pd.to_datetime(df[col_map["date"]], dayfirst=True, errors="coerce")
    result["amount"]   = pd.to_numeric(df[col_map["amount"]].astype(str).str.replace(r"[^\d.\-]", "", regex=True), errors="coerce")
    result["merchant"] = df[col_map["merchant"]] if "merchant" in col_map else ""
    result = result.dropna(subset=["date", "amount"])
    result = result[result["amount"] != 0]
    return result

@router.post("/upload", status_code=201)
async def upload_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    filename  = file.filename.lower()

    if filename.endswith(".csv"):
        df        = parse_csv(contents)
        file_type = "csv"
    elif filename.endswith(".pdf"):
        df        = parse_pdf(contents)
        file_type = "pdf"
    else:
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are supported")

    total      = len(df)
    imported   = 0
    duplicates = 0

    for _, row in df.iterrows():
        merchant = str(row.get("merchant", "")).strip()
        amount   = abs(float(row["amount"]))
        date     = row["date"].to_pydatetime()
        txn_type = "expense" if float(row["amount"]) < 0 else "income"
        category = smart_categorize(merchant)

        if is_duplicate(db, current_user.id, amount, date, merchant):
            duplicates += 1
            continue

        txn = Transaction(
            user_id     = current_user.id,
            amount      = amount,
            type        = txn_type,
            merchant    = merchant or None,
            category    = category,
            date        = date,
            description = f"Imported from {file_type.upper()}",
        )
        db.add(txn)
        imported += 1

    db.commit()

    history = ImportHistory(
        user_id        = current_user.id,
        filename       = file.filename,
        file_type      = file_type,
        total_rows     = total,
        imported_rows  = imported,
        duplicate_rows = duplicates,
    )
    db.add(history)
    db.commit()

    return {
        "message":    f"Import complete",
        "total":      total,
        "imported":   imported,
        "duplicates": duplicates,
        "skipped":    total - imported - duplicates,
    }

@router.get("/history", response_model=List[ImportHistoryOut])
def get_import_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ImportHistory).filter(
        ImportHistory.user_id == current_user.id
    ).order_by(ImportHistory.created_at.desc()).all()