from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.models import Transaction, User
from schemas.schemas import TransactionCreate, TransactionUpdate, TransactionOut
from utils.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("/", response_model=List[TransactionOut])
def get_transactions(
    category: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if category:
        q = q.filter(Transaction.category == category)
    if type:
        q = q.filter(Transaction.type == type)
    return q.order_by(Transaction.date.desc()).all()

@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = Transaction(**payload.model_dump(), user_id=current_user.id)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn

@router.put("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = db.query(Transaction).filter(
        Transaction.id == txn_id,
        Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)
    db.commit()
    db.refresh(txn)
    return txn

@router.delete("/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = db.query(Transaction).filter(
        Transaction.id == txn_id,
        Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()