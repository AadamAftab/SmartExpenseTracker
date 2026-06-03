from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    income  = "income"
    expense = "expense"

# --- Auth ---
class UserCreate(BaseModel):
    name:     str
    email:    EmailStr
    password: str

class UserOut(BaseModel):
    id:         int
    name:       str
    email:      str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type:   str

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

# --- Transactions ---
class TransactionCreate(BaseModel):
    amount:      float
    type:        TransactionType
    merchant:    Optional[str] = None
    category:    str = "Uncategorized"
    date:        datetime
    description: Optional[str] = None

class TransactionUpdate(BaseModel):
    amount:      Optional[float] = None
    type:        Optional[TransactionType] = None
    merchant:    Optional[str] = None
    category:    Optional[str] = None
    date:        Optional[datetime] = None
    description: Optional[str] = None

class TransactionOut(BaseModel):
    id:          int
    user_id:     int
    amount:      float
    type:        TransactionType
    merchant:    Optional[str]
    category:    str
    date:        datetime
    description: Optional[str]
    created_at:  datetime

    class Config:
        from_attributes = True

class ImportHistoryOut(BaseModel):
    id:             int
    filename:       str
    file_type:      str
    total_rows:     int
    imported_rows:  int
    duplicate_rows: int
    created_at:     datetime

    class Config:
        from_attributes = True