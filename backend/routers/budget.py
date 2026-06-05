from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.models import Budget, Transaction, User
from schemas.schemas import BudgetCreate, BudgetUpdate, BudgetOut, BudgetUsage
from utils.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("/", response_model=List[BudgetUsage])
def get_budgets(
    month: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month   == month,
    ).all()

    year, mon = map(int, month.split("-"))
    start = datetime(year, mon, 1)
    if mon == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, mon + 1, 1)

    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type    == "expense",
        Transaction.date    >= start,
        Transaction.date    <  end,
    ).all()

    spent_by_category = {}
    for t in transactions:
        spent_by_category[t.category] = spent_by_category.get(t.category, 0) + t.amount

    result = []
    for b in budgets:
        spent     = round(spent_by_category.get(b.category, 0), 2)
        remaining = round(b.limit - spent, 2)
        percentage = round((spent / b.limit) * 100, 1) if b.limit > 0 else 0

        if percentage >= 100:
            status = "danger"
        elif percentage >= 80:
            status = "warning"
        else:
            status = "ok"

        result.append(BudgetUsage(
            id         = b.id,
            category   = b.category,
            limit      = b.limit,
            spent      = spent,
            remaining  = remaining,
            percentage = percentage,
            status     = status,
        ))

    return sorted(result, key=lambda x: x.percentage, reverse=True)


@router.post("/", response_model=BudgetOut, status_code=201)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Budget).filter(
        Budget.user_id  == current_user.id,
        Budget.category == payload.category,
        Budget.month    == payload.month,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and month")

    budget = Budget(
        user_id  = current_user.id,
        category = payload.category,
        limit    = payload.limit,
        month    = payload.month,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.id      == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.limit = payload.limit
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.id      == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()


@router.get("/runway")
def get_runway(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now        = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1)
    else:
        month_end = datetime(now.year, now.month + 1, 1)

    days_in_month  = (month_end - month_start).days
    days_elapsed   = (now - month_start).days + 1
    days_remaining = days_in_month - days_elapsed

    # Income this month
    income = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type    == "income",
        Transaction.date    >= month_start,
        Transaction.date    <  month_end,
    ).all()
    total_income = sum(t.amount for t in income)

    # Expenses this month
    expenses = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type    == "expense",
        Transaction.date    >= month_start,
        Transaction.date    <  month_end,
    ).all()
    total_expense = sum(t.amount for t in expenses)

    balance = total_income - total_expense

    # Daily burn rate
    daily_burn = total_expense / days_elapsed if days_elapsed > 0 else 0

    # Days to broke
    if daily_burn > 0 and balance > 0:
        days_to_broke = int(balance / daily_burn)
    elif balance <= 0:
        days_to_broke = 0
    else:
        days_to_broke = days_remaining

    # Projected month end balance
    projected_expense  = daily_burn * days_in_month
    projected_balance  = total_income - projected_expense

    # Burn status
    if days_to_broke <= 3:
        burn_status = "critical"
    elif days_to_broke <= 7:
        burn_status = "warning"
    else:
        burn_status = "ok"

    return {
        "balance":           round(balance, 2),
        "total_income":      round(total_income, 2),
        "total_expense":     round(total_expense, 2),
        "daily_burn":        round(daily_burn, 2),
        "days_to_broke":     days_to_broke,
        "days_remaining":    days_remaining,
        "days_elapsed":      days_elapsed,
        "projected_expense": round(projected_expense, 2),
        "projected_balance": round(projected_balance, 2),
        "burn_status":       burn_status,
    }