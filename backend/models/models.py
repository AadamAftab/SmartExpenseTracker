from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    transactions  = relationship("Transaction", back_populates="owner")
    budgets       = relationship("Budget", back_populates="owner")

class Transaction(Base):
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount      = Column(Float, nullable=False)
    type        = Column(Enum(TransactionType), nullable=False)
    merchant    = Column(String, nullable=True)
    category    = Column(String, nullable=False, default="Uncategorized")
    date        = Column(DateTime(timezone=True), nullable=False)
    description = Column(String, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    limit    = Column(Float, nullable=False)
    month    = Column(String, nullable=False)  # format: "2026-06"

    owner = relationship("User", back_populates="budgets")