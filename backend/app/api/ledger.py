"""Ledger HTTP routes used by the dashboard workspace."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.database import get_db_session
from backend.app.models.user import User
from backend.app.schemas.ledger import (
    AccountCreateRequest,
    AccountOut,
    BudgetOut,
    BudgetUpsertRequest,
    CategoryCreateRequest,
    CategoryOut,
    GoalCreateRequest,
    GoalOut,
    ItemResponse,
    ListResponse,
    TransactionCreateRequest,
    TransactionOut,
)
from backend.app.services import ledger_service
from backend.app.services.ledger_service import LedgerError, signed_amount

router = APIRouter(prefix="/api", tags=["Ledger"])


def _ledger_http_error(exc: LedgerError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)


def _transaction_out(tx) -> TransactionOut:
    category_name = tx.category.name if getattr(tx, "category", None) else None
    return TransactionOut(
        id=tx.id,
        account_id=tx.account_id,
        transaction_type=tx.transaction_type,
        status=tx.status,
        amount=tx.amount,
        signed_amount=signed_amount(tx.transaction_type, tx.amount),
        currency=tx.currency,
        description=tx.description,
        merchant_name=tx.merchant_name,
        transaction_date=tx.transaction_date,
        category_id=tx.category_id,
        category_name=category_name,
    )


@router.get("/accounts", response_model=ListResponse)
async def list_accounts(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    accounts = await ledger_service.list_accounts(db, user)
    return ListResponse(
        success=True,
        message="Accounts loaded",
        data=[AccountOut.model_validate(item).model_dump(mode="json") for item in accounts],
    )


@router.post("/accounts", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    account = await ledger_service.create_account(db, user, payload)
    return ItemResponse(
        success=True,
        message="Account created",
        data=AccountOut.model_validate(account).model_dump(mode="json"),
    )


@router.get("/categories", response_model=ListResponse)
async def list_categories(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    categories = await ledger_service.list_categories(db, user)
    return ListResponse(
        success=True,
        message="Categories loaded",
        data=[CategoryOut.model_validate(item).model_dump(mode="json") for item in categories],
    )


@router.post("/categories", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    category = await ledger_service.create_category(db, user, payload)
    return ItemResponse(
        success=True,
        message="Category created",
        data=CategoryOut.model_validate(category).model_dump(mode="json"),
    )


@router.get("/transactions", response_model=ListResponse)
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    transactions = await ledger_service.list_transactions(db, user, limit=limit)
    return ListResponse(
        success=True,
        message="Transactions loaded",
        data=[_transaction_out(item).model_dump(mode="json") for item in transactions],
    )


@router.post("/transactions", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        transaction = await ledger_service.create_transaction(db, user, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Transaction recorded",
        data=_transaction_out(transaction).model_dump(mode="json"),
    )


@router.get("/goals", response_model=ListResponse)
async def list_goals(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    goals = await ledger_service.list_goals(db, user)
    return ListResponse(
        success=True,
        message="Goals loaded",
        data=[GoalOut.model_validate(item).model_dump(mode="json") for item in goals],
    )


@router.post("/goals", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        goal = await ledger_service.create_goal(db, user, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Goal created",
        data=GoalOut.model_validate(goal).model_dump(mode="json"),
    )


@router.get("/budgets", response_model=ListResponse)
async def list_budgets(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    budgets = await ledger_service.list_budgets(db, user)
    return ListResponse(
        success=True,
        message="Budgets loaded",
        data=[
            BudgetOut(
                id=item.id,
                category_id=item.category_id,
                category_name=item.category.name if item.category else "Category",
                monthly_limit=item.monthly_limit,
                spent=0,
            ).model_dump(mode="json")
            for item in budgets
        ],
    )


@router.put("/budgets", response_model=ItemResponse)
async def upsert_budget(
    payload: BudgetUpsertRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        budget = await ledger_service.upsert_budget(db, user, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Budget saved",
        data=BudgetOut(
            id=budget.id,
            category_id=budget.category_id,
            category_name=budget.category.name if budget.category else "Category",
            monthly_limit=budget.monthly_limit,
            spent=0,
        ).model_dump(mode="json"),
    )
