from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models.models import Transaction, User
from utils.auth import get_current_user
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_user_transactions(db, user_id, months_back=6):
    cutoff = datetime.utcnow() - timedelta(days=months_back * 30)
    return db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= cutoff
    ).all()


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now        = datetime.utcnow()
    this_month = now.replace(day=1, hour=0, minute=0, second=0)
    last_month = (this_month - timedelta(days=1)).replace(day=1)

    def month_stats(start, end):
        txns = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.date   >= start,
            Transaction.date   <  end,
        ).all()
        income  = sum(t.amount for t in txns if t.type == "income")
        expense = sum(t.amount for t in txns if t.type == "expense")
        return {"income": income, "expense": expense, "savings": income - expense}

    this = month_stats(this_month, now)
    last = month_stats(last_month, this_month)

    def pct_change(current, previous):
        if previous == 0:
            return 0
        return round(((current - previous) / previous) * 100, 1)

    return {
        "this_month": this,
        "last_month": last,
        "changes": {
            "income":  pct_change(this["income"],  last["income"]),
            "expense": pct_change(this["expense"], last["expense"]),
            "savings": pct_change(this["savings"], last["savings"]),
        }
    }


@router.get("/monthly-trend")
def monthly_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=6)

    monthly = defaultdict(lambda: {"income": 0, "expense": 0})
    for t in txns:
        key = t.date.strftime("%Y-%m")
        if t.type == "income":
            monthly[key]["income"] += t.amount
        else:
            monthly[key]["expense"] += t.amount

    result = []
    for month in sorted(monthly.keys()):
        result.append({
            "month":   month,
            "income":  round(monthly[month]["income"],  2),
            "expense": round(monthly[month]["expense"], 2),
            "savings": round(monthly[month]["income"] - monthly[month]["expense"], 2),
        })
    return result


@router.get("/category-trend")
def category_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=3)
    expenses = [t for t in txns if t.type == "expense"]

    data = defaultdict(lambda: defaultdict(float))
    for t in expenses:
        month = t.date.strftime("%Y-%m")
        data[t.category][month] += t.amount

    result = []
    for category, months in data.items():
        result.append({
            "category": category,
            "months":   dict(months),
            "total":    round(sum(months.values()), 2),
        })
    return sorted(result, key=lambda x: x["total"], reverse=True)


@router.get("/top-merchants")
def top_merchants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=3)
    expenses = [t for t in txns if t.type == "expense" and t.merchant]

    merchant_data = defaultdict(lambda: {"total": 0, "count": 0, "category": ""})
    for t in expenses:
        merchant_data[t.merchant]["total"]    += t.amount
        merchant_data[t.merchant]["count"]    += 1
        merchant_data[t.merchant]["category"]  = t.category

    result = []
    for merchant, data in merchant_data.items():
        result.append({
            "merchant": merchant,
            "total":    round(data["total"], 2),
            "count":    data["count"],
            "category": data["category"],
            "avg":      round(data["total"] / data["count"], 2),
        })
    return sorted(result, key=lambda x: x["total"], reverse=True)[:10]


@router.get("/daily-pattern")
def daily_pattern(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=3)
    expenses = [t for t in txns if t.type == "expense"]

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_data = defaultdict(lambda: {"total": 0, "count": 0})

    for t in expenses:
        day = days[t.date.weekday()]
        day_data[day]["total"] += t.amount
        day_data[day]["count"] += 1

    result = []
    for day in days:
        d = day_data[day]
        result.append({
            "day":   day,
            "total": round(d["total"], 2),
            "count": d["count"],
            "avg":   round(d["total"] / d["count"], 2) if d["count"] > 0 else 0,
        })
    return result


@router.get("/weekend-vs-weekday")
def weekend_vs_weekday(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=3)
    expenses = [t for t in txns if t.type == "expense"]

    weekend = {"total": 0, "count": 0}
    weekday = {"total": 0, "count": 0}

    for t in expenses:
        if t.date.weekday() >= 5:
            weekend["total"] += t.amount
            weekend["count"] += 1
        else:
            weekday["total"] += t.amount
            weekday["count"] += 1

    return {
        "weekend": {
            "total": round(weekend["total"], 2),
            "count": weekend["count"],
            "avg":   round(weekend["total"] / weekend["count"], 2) if weekend["count"] > 0 else 0,
        },
        "weekday": {
            "total": round(weekday["total"], 2),
            "count": weekday["count"],
            "avg":   round(weekday["total"] / weekday["count"], 2) if weekday["count"] > 0 else 0,
        }
    }


@router.get("/subscriptions")
def detect_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = get_user_transactions(db, current_user.id, months_back=6)
    expenses = [t for t in txns if t.type == "expense" and t.merchant]

    merchant_months = defaultdict(set)
    merchant_amounts = defaultdict(list)

    for t in expenses:
        month = t.date.strftime("%Y-%m")
        merchant_months[t.merchant].add(month)
        merchant_amounts[t.merchant].append(t.amount)

    subscriptions = []
    for merchant, months in merchant_months.items():
        if len(months) >= 2:
            amounts = merchant_amounts[merchant]
            avg_amount = sum(amounts) / len(amounts)
            variance   = sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)
            # Low variance + recurring = subscription
            if variance < (avg_amount * 0.1) ** 2:
                subscriptions.append({
                    "merchant":    merchant,
                    "avg_amount":  round(avg_amount, 2),
                    "months_seen": len(months),
                    "total_spent": round(sum(amounts), 2),
                    "category":    next(
                        t.category for t in expenses if t.merchant == merchant
                    ),
                })

    return sorted(subscriptions, key=lambda x: x["total_spent"], reverse=True)