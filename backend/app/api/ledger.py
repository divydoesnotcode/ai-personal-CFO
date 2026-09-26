"""Ledger HTTP routes used by the dashboard workspace."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.database import get_db_session
from backend.app.models.user import User
from backend.app.schemas.ledger import (
    AccountCreateRequest,
    AccountOut,
    AccountUpdateRequest,
    BudgetOut,
    BudgetUpsertRequest,
    CategoryCreateRequest,
    CategoryOut,
    CategoryUpdateRequest,
    GoalCreateRequest,
    GoalOut,
    GoalUpdateRequest,
    ItemResponse,
    ListResponse,
    TransactionCreateRequest,
    TransactionOut,
    TransactionUpdateRequest,
)
from backend.app.services import ledger_service
from backend.app.services.ledger_service import LedgerError, signed_amount

router = APIRouter(prefix="/api", tags=["Ledger"])


def _ledger_http_error(exc: LedgerError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)


def _transaction_out(tx) -> TransactionOut:
    category_name = tx.category.name if getattr(tx, "category", None) else None
    account_name = tx.account.name if getattr(tx, "account", None) else None
    return TransactionOut(
        id=tx.id,
        account_id=tx.account_id,
        account_name=account_name,
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


@router.put("/accounts/{account_id}", response_model=ItemResponse)
async def update_account(
    account_id: UUID,
    payload: AccountUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        account = await ledger_service.update_account(db, user, account_id, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Account updated",
        data=AccountOut.model_validate(account).model_dump(mode="json"),
    )


@router.delete("/accounts/{account_id}", response_model=ItemResponse)
async def delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        await ledger_service.delete_account(db, user, account_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Account deleted",
        data={"id": str(account_id)},
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


@router.put("/categories/{category_id}", response_model=ItemResponse)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        category = await ledger_service.update_category(db, user, category_id, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Category updated",
        data=CategoryOut.model_validate(category).model_dump(mode="json"),
    )


@router.delete("/categories/{category_id}", response_model=ItemResponse)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        await ledger_service.delete_category(db, user, category_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Category deleted",
        data={"id": str(category_id)},
    )


@router.get("/transactions", response_model=ListResponse)
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=5000),
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ListResponse:
    transactions = await ledger_service.list_transactions(db, user, limit=limit)
    return ListResponse(
        success=True,
        message="Transactions loaded",
        data=[_transaction_out(item).model_dump(mode="json") for item in transactions],
    )


@router.get("/transactions/{transaction_id}", response_model=ItemResponse)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        transaction = await ledger_service.get_transaction(db, user, transaction_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Transaction loaded",
        data=_transaction_out(transaction).model_dump(mode="json"),
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


@router.put("/transactions/{transaction_id}", response_model=ItemResponse)
async def update_transaction(
    transaction_id: UUID,
    payload: TransactionUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        transaction = await ledger_service.update_transaction(
            db, user, transaction_id, payload
        )
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Transaction updated",
        data=_transaction_out(transaction).model_dump(mode="json"),
    )


@router.delete("/transactions/{transaction_id}", response_model=ItemResponse)
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        await ledger_service.delete_transaction(db, user, transaction_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Transaction deleted",
        data={"id": str(transaction_id)},
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


@router.put("/goals/{goal_id}", response_model=ItemResponse)
async def update_goal(
    goal_id: UUID,
    payload: GoalUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        goal = await ledger_service.update_goal(db, user, goal_id, payload)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Goal updated",
        data=GoalOut.model_validate(goal).model_dump(mode="json"),
    )


@router.delete("/goals/{goal_id}", response_model=ItemResponse)
async def delete_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        await ledger_service.delete_goal(db, user, goal_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Goal deleted",
        data={"id": str(goal_id)},
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


@router.delete("/budgets/{budget_id}", response_model=ItemResponse)
async def delete_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        await ledger_service.delete_budget(db, user, budget_id)
    except LedgerError as exc:
        raise _ledger_http_error(exc) from exc
    return ItemResponse(
        success=True,
        message="Budget deleted",
        data={"id": str(budget_id)},
    )
