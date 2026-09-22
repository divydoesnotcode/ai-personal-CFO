"""Dashboard HTTP routes."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.database import get_db_session
from backend.app.models.user import User
from backend.app.schemas.dashboard import DashboardResponse
from backend.app.services.dashboard_service import build_dashboard

router = APIRouter(prefix="/api", tags=["Dashboard"])

CashFlowRangeQuery = Literal["7D", "30D", "3M", "6M", "1Y"]


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    responses={
        401: {"description": "Missing or invalid token"},
    },
)
async def get_dashboard(
    range: CashFlowRangeQuery = Query(default="6M"),
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> DashboardResponse:
    payload = await build_dashboard(db, user, range)
    return DashboardResponse(
        success=True,
        message="Dashboard loaded",
        data=payload,
    )
