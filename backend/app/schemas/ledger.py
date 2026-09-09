"""Request and response schemas for ledger write APIs."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.models.account import AccountType
from backend.app.models.financial_goal import GoalStatus, GoalType
from backend.app.models.transaction import TransactionStatus, TransactionType


class AccountCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    account_type: AccountType
    description: str | None = Field(default=None, max_length=2000)
    balance: Decimal = Field(default=Decimal("0"), ge=0)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = " ".join(value.split())
        if not name:
            raise ValueError("Enter an account name")
        return name


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    account_type: AccountType
    description: str | None
    balance: Decimal
    is_active: bool


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = " ".join(value.split())
        if not name:
            raise ValueError("Enter a category name")
        return name


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    is_system: bool
    user_id: UUID | None


class TransactionCreateRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    transaction_type: TransactionType
    account_id: UUID | None = None
    category_id: UUID | None = None
    description: str | None = Field(default=None, max_length=2000)
    merchant_name: str | None = Field(default=None, max_length=255)
    transaction_date: datetime | None = None
    status: TransactionStatus = TransactionStatus.POSTED
    transfer_account_id: UUID | None = None


class TransactionOut(BaseModel):
    id: UUID
    account_id: UUID
    transaction_type: TransactionType
    status: TransactionStatus
    amount: Decimal
    signed_amount: Decimal
    currency: str
    description: str | None
    merchant_name: str | None
    transaction_date: datetime
    category_id: UUID | None
    category_name: str | None


class GoalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    goal_type: GoalType = GoalType.SAVINGS
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0)
    target_date: date
    description: str | None = Field(default=None, max_length=2000)
    is_priority: bool = False

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = " ".join(value.split())
        if not name:
            raise ValueError("Enter a goal name")
        return name


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    goal_type: GoalType
    status: GoalStatus
    target_amount: Decimal
    current_amount: Decimal
    target_date: date
    is_priority: bool


class BudgetUpsertRequest(BaseModel):
    category_id: UUID
    monthly_limit: Decimal = Field(gt=0)


class BudgetOut(BaseModel):
    id: UUID
    category_id: UUID
    category_name: str
    monthly_limit: Decimal
    spent: Decimal


class ListResponse(BaseModel):
    success: bool = True
    message: str
    data: list


class ItemResponse(BaseModel):
    success: bool = True
    message: str
    data: object
