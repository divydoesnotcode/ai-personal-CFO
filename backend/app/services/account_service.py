"""Profile, workspace settings, financial preferences, and sessions."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.user import User
from backend.app.models.user_preference import (
    DENSITY_VALUES,
    RISK_VALUES,
    UserPreference,
)
from backend.app.models.user_session import UserSession
from backend.app.schemas.account import (
    FinancialPreferencesUpdateRequest,
    ProfileUpdateRequest,
    WorkspaceSettingsUpdateRequest,
)
from backend.app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    get_user_by_email,
    issue_session,
)
from backend.app.utils.security import hash_password, verify_password

logger = logging.getLogger(__name__)


class AccountError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def update_profile(
    db: AsyncSession,
    user: User,
    payload: ProfileUpdateRequest,
) -> User:
    if payload.name is None and payload.email is None:
        raise AccountError("Nothing to update")

    if payload.name is not None:
        user.name = payload.name

    if payload.email is not None and payload.email != user.email:
        existing = await get_user_by_email(db, payload.email)
        if existing is not None and existing.id != user.id:
            raise EmailAlreadyRegisteredError()
        user.email = payload.email

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise EmailAlreadyRegisteredError() from None

    await db.refresh(user)
    return user


async def get_or_create_preferences(
    db: AsyncSession,
    user: User,
) -> UserPreference:
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if pref is not None:
        return pref

    pref = UserPreference(user_id=user.id)
    db.add(pref)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == user.id)
        )
        existing = result.scalar_one_or_none()
        if existing is None:
            raise
        return existing
    await db.refresh(pref)
    return pref


async def update_settings(
    db: AsyncSession,
    user: User,
    payload: WorkspaceSettingsUpdateRequest,
) -> UserPreference:
    pref = await get_or_create_preferences(db, user)
    if payload.density is not None:
        if payload.density not in DENSITY_VALUES:
            raise AccountError("Choose a valid density")
        pref.density = payload.density
    if payload.notifyBudget is not None:
        pref.notify_budget = payload.notifyBudget
    if payload.notifyUpcoming is not None:
        pref.notify_upcoming = payload.notifyUpcoming
    if payload.notifyGoals is not None:
        pref.notify_goals = payload.notifyGoals
    await db.commit()
    await db.refresh(pref)
    return pref


async def update_preferences(
    db: AsyncSession,
    user: User,
    payload: FinancialPreferencesUpdateRequest,
) -> UserPreference:
    pref = await get_or_create_preferences(db, user)
    if payload.riskTolerance is not None:
        if payload.riskTolerance not in RISK_VALUES:
            raise AccountError("Choose a valid risk tolerance")
        pref.risk_tolerance = payload.riskTolerance
    if payload.monthlySavingsTargetPct is not None:
        pref.monthly_savings_target_pct = Decimal(
            payload.monthlySavingsTargetPct
        ).quantize(Decimal("0.01"))
    if payload.emergencyFundMonths is not None:
        pref.emergency_fund_months = payload.emergencyFundMonths
    await db.commit()
    await db.refresh(pref)
    return pref


async def list_active_sessions(
    db: AsyncSession,
    user: User,
    *,
    current_jti: UUID | None,
) -> list[tuple[UserSession, bool]]:
    now = _now()
    result = await db.execute(
        select(UserSession)
        .where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
        .order_by(UserSession.created_at.desc())
    )
    rows: list[tuple[UserSession, bool]] = []
    for session in result.scalars():
        rows.append((session, current_jti is not None and session.id == current_jti))
    return rows


async def revoke_session(
    db: AsyncSession,
    user: User,
    session_id: UUID,
) -> bool:
    """Revoke one session. Returns True when it was the current session."""
    result = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise AccountError("Session not found")
    if session.revoked_at is None:
        session.revoked_at = _now()
        await db.commit()
    return True


async def revoke_all_sessions(
    db: AsyncSession,
    user: User,
) -> None:
    now = _now()
    await db.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    user.token_version = int(user.token_version) + 1
    await db.commit()


async def revoke_current_session(
    db: AsyncSession,
    *,
    jti: UUID | None,
) -> None:
    if jti is None:
        return
    result = await db.execute(select(UserSession).where(UserSession.id == jti))
    session = result.scalar_one_or_none()
    if session is None or session.revoked_at is not None:
        return
    session.revoked_at = _now()
    await db.commit()


async def change_password(
    db: AsyncSession,
    user: User,
    *,
    current_password: str,
    new_password: str,
    user_agent: str | None,
) -> str:
    matched = await asyncio.to_thread(
        verify_password,
        current_password,
        user.password_hash,
    )
    if not matched:
        raise InvalidCredentialsError()

    if current_password == new_password:
        raise AccountError("Choose a password that is different from the current one")

    user.password_hash = await asyncio.to_thread(hash_password, new_password)
    user.password_changed_at = _now()
    user.token_version = int(user.token_version) + 1

    now = _now()
    await db.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    await db.flush()
    token = await issue_session(db, user, user_agent=user_agent)
    return token
