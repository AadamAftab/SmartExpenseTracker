from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models.models import Transaction, User
from utils.auth import get_current_user
from utils.categorizer import categorize, rule_based_category, ai_categorize, CATEGORIES

router = APIRouter(prefix="/categorize", tags=["Categorization"])

class SuggestRequest(BaseModel):
    merchant: str

class BulkCategorizeRequest(BaseModel):
    use_ai: Optional[bool] = False

@router.post("/suggest")
def suggest_category(
    payload: SuggestRequest,
    current_user: User = Depends(get_current_user),
):
    merchant = payload.merchant.strip()
    rule     = rule_based_category(merchant)

    if rule:
        return {"category": rule, "source": "rule"}

    ai_result = ai_categorize(merchant)
    return {"category": ai_result, "source": "ai"}

@router.post("/bulk")
def bulk_categorize(
    payload: BulkCategorizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category == "Other",
    ).all()

    updated = 0
    for txn in transactions:
        if txn.merchant:
            new_cat = categorize(txn.merchant) if payload.use_ai else rule_based_category(txn.merchant)
            if new_cat and new_cat != txn.category:
                txn.category = new_cat
                updated += 1

    db.commit()
    return {"message": f"Updated {updated} transactions", "updated": updated}

@router.get("/categories")
def get_categories(current_user: User = Depends(get_current_user)):
    return {"categories": CATEGORIES}