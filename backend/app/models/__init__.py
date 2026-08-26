"""
SQLAlchemy model registry for AI Personal CFO.

This module imports every ORM model so that SQLAlchemy's metadata contains
the complete application schema.

Alembic imports this module before generating migrations.

Do not place business logic in this file.
"""

from backend.app.models.account import Account, AccountType
from backend.app.models.base import Base, BaseModel
from backend.app.models.category import Category
from backend.app.models.financial_goal import (
    FinancialGoal,
    GoalStatus,
    GoalType,
)
from backend.app.models.transaction import (
    Transaction,
    TransactionStatus,
    TransactionType,
)
from backend.app.models.user import User

__all__ = [
    "Base",
    "BaseModel",
    "User",
    "Account",
    "AccountType",
    "Transaction",
    "TransactionStatus",
    "TransactionType",
    "Category",
    "FinancialGoal",
    "GoalStatus",
    "GoalType",
]
