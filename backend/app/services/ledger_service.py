"""Ledger writes: accounts, categories, transactions, goals, budgets."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.account import Account, AccountType
from backend.app.models.budget import Budget
from backend.app.models.category import Category
from backend.app.models.financial_goal import FinancialGoal, GoalStatus
from backend.app.models.transaction import (
    Transaction,
    TransactionStatus,
    TransactionType,
)
from backend.app.models.user import User
from backend.app.schemas.ledger import (
    AccountCreateRequest,
    BudgetUpsertRequest,
    CategoryCreateRequest,
    GoalCreateRequest,
    TransactionCreateRequest,
)

logger = logging.getLogger(__name__)

LIABILITY_TYPES = {AccountType.CREDIT_CARD, AccountType.LOAN}
INFLOW_TYPES = {
    TransactionType.INCOME,
    TransactionType.REFUND,
    TransactionType.INTEREST,
    TransactionType.DIVIDEND,
}
OUTFLOW_TYPES = {
    TransactionType.EXPENSE,
    TransactionType.FEE,
    TransactionType.LOAN_PAYMENT,
}


class LedgerError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def money(value: Decimal | int | float) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def signed_amount(tx_type: TransactionType, amount: Decimal) -> Decimal:
    if tx_type in INFLOW_TYPES:
        return amount
    if tx_type in OUTFLOW_TYPES:
        return -amount
    return Decimal("0.00")


def balance_delta(
    account_type: AccountType,
    tx_type: TransactionType,
    amount: Decimal,
) -> Decimal:
    liability = account_type in LIABILITY_TYPES
    if tx_type in INFLOW_TYPES:
        return -amount if liability else amount
    if tx_type in (TransactionType.EXPENSE, TransactionType.FEE):
        return amount if liability else -amount
    if tx_type == TransactionType.LOAN_PAYMENT:
        return -amount
    if tx_type == TransactionType.TRANSFER:
        return -amount
    return Decimal("0")


def apply_balance_change(account: Account, delta: Decimal) -> None:
    next_balance = money(account.balance + delta)
    if next_balance < 0:
        raise LedgerError("This movement would take the account below zero")
    account.balance = next_balance


def visible_categories_query(user_id: UUID) -> Select[tuple[Category]]:
    return (
        select(Category)
        .where(
            Category.is_active.is_(True),
            or_(Category.user_id.is_(None), Category.user_id == user_id),
        )
        .order_by(Category.is_system.desc(), Category.name.asc())
    )


async def list_accounts(db: AsyncSession, user: User) -> list[Account]:
    result = await db.execute(
        select(Account)
        .where(Account.user_id == user.id, Account.is_active.is_(True))
        .order_by(Account.created_at.asc())
    )
    return list(result.scalars().all())


async def create_account(
    db: AsyncSession,
    user: User,
    payload: AccountCreateRequest,
) -> Account:
    account = Account(
        user_id=user.id,
        name=payload.name,
        account_type=payload.account_type,
        description=payload.description,
        balance=money(payload.balance),
        is_active=True,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def ensure_default_account(db: AsyncSession, user: User) -> Account:
    accounts = await list_accounts(db, user)
    if accounts:
        return accounts[0]
    account = Account(
        user_id=user.id,
        name="Cash",
        account_type=AccountType.CASH,
        balance=Decimal("0.00"),
        is_active=True,
    )
    db.add(account)
    await db.flush()
    return account


async def list_categories(db: AsyncSession, user: User) -> list[Category]:
    result = await db.execute(visible_categories_query(user.id))
    return list(result.scalars().all())


async def create_category(
    db: AsyncSession,
    user: User,
    payload: CategoryCreateRequest,
) -> Category:
    category = Category(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        is_system=False,
        is_active=True,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def get_owned_account(
    db: AsyncSession,
    user: User,
    account_id: UUID,
) -> Account:
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == user.id,
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise LedgerError("Account not found")
    return account


async def get_visible_category(
    db: AsyncSession,
    user: User,
    category_id: UUID,
) -> Category:
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.is_active.is_(True),
            or_(Category.user_id.is_(None), Category.user_id == user.id),
        )
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise LedgerError("Category not found")
    return category


async def create_transaction(
    db: AsyncSession,
    user: User,
    payload: TransactionCreateRequest,
) -> Transaction:
    if payload.account_id is None:
        existing = await list_accounts(db, user)
        if not existing and payload.transaction_type in OUTFLOW_TYPES:
            raise LedgerError(
                "Add an account or record income before posting an expense"
            )
        account = existing[0] if existing else await ensure_default_account(db, user)
    else:
        account = await get_owned_account(db, user, payload.account_id)

    category = None
    if payload.category_id is not None:
        category = await get_visible_category(db, user, payload.category_id)

    transfer_account = None
    if payload.transaction_type == TransactionType.TRANSFER:
        if payload.transfer_account_id is None:
            raise LedgerError("A destination account is required for transfers")
        transfer_account = await get_owned_account(
            db, user, payload.transfer_account_id
        )
        if transfer_account.id == account.id:
            raise LedgerError("Choose two different accounts for a transfer")

    occurred = payload.transaction_date or datetime.now(timezone.utc)
    if occurred.tzinfo is None:
        occurred = occurred.replace(tzinfo=timezone.utc)

    amount = money(payload.amount)
    transaction = Transaction(
        user_id=user.id,
        account_id=account.id,
        transaction_type=payload.transaction_type,
        status=payload.status,
        amount=amount,
        description=payload.description,
        merchant_name=payload.merchant_name,
        transaction_date=occurred,
        category_id=category.id if category else None,
        transfer_account_id=transfer_account.id if transfer_account else None,
    )
    db.add(transaction)

    if payload.status == TransactionStatus.POSTED:
        apply_balance_change(
            account,
            balance_delta(account.account_type, payload.transaction_type, amount),
        )
        if transfer_account is not None:
            dest_delta = (
                -amount
                if transfer_account.account_type in LIABILITY_TYPES
                else amount
            )
            apply_balance_change(transfer_account, dest_delta)

    await db.commit()
    await db.refresh(transaction)
    transaction.category = category
    return transaction


async def list_transactions(
    db: AsyncSession,
    user: User,
    *,
    limit: int = 50,
) -> list[Transaction]:
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_goals(db: AsyncSession, user: User) -> list[FinancialGoal]:
    result = await db.execute(
        select(FinancialGoal)
        .where(
            FinancialGoal.user_id == user.id,
            FinancialGoal.status != GoalStatus.CANCELLED,
        )
        .order_by(
            FinancialGoal.is_priority.desc(),
            FinancialGoal.target_date.asc(),
        )
    )
    return list(result.scalars().all())


async def create_goal(
    db: AsyncSession,
    user: User,
    payload: GoalCreateRequest,
) -> FinancialGoal:
    if payload.current_amount > payload.target_amount:
        raise LedgerError("Current amount cannot exceed the target")

    goal = FinancialGoal(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        goal_type=payload.goal_type,
        status=GoalStatus.ACTIVE,
        target_amount=money(payload.target_amount),
        current_amount=money(payload.current_amount),
        target_date=payload.target_date,
        is_priority=payload.is_priority,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


async def list_budgets(db: AsyncSession, user: User) -> list[Budget]:
    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.user_id == user.id)
        .order_by(Budget.created_at.asc())
    )
    return list(result.scalars().all())


async def upsert_budget(
    db: AsyncSession,
    user: User,
    payload: BudgetUpsertRequest,
) -> Budget:
    category = await get_visible_category(db, user, payload.category_id)

    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(
            Budget.user_id == user.id,
            Budget.category_id == payload.category_id,
        )
    )
    budget = result.scalar_one_or_none()
    if budget is None:
        budget = Budget(
            user_id=user.id,
            category_id=payload.category_id,
            monthly_limit=money(payload.monthly_limit),
        )
        db.add(budget)
    else:
        budget.monthly_limit = money(payload.monthly_limit)

    await db.commit()
    await db.refresh(budget)
    budget.category = category
    return budget
