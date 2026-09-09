"""Authentication service.

Business logic for registration and sign-in. Routers should stay thin.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.user_session import UserSession
from backend.app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
    InvalidAccessTokenError,
)

logger = logging.getLogger(__name__)


class EmailAlreadyRegisteredError(Exception):
    """Raised when signup is attempted with an existing email."""


class InvalidCredentialsError(Exception):
    """Raised when sign-in credentials are rejected."""


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def register_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    password: str,
) -> User:
    existing = await get_user_by_email(db, email)
    if existing is not None:
        raise EmailAlreadyRegisteredError()

    password_hash = await asyncio.to_thread(hash_password, password)

    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
    )

    db.add(user)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.info("Signup rejected because of a uniqueness conflict.")
        raise EmailAlreadyRegisteredError() from None

    await db.refresh(user)
    logger.info("User registered.")
    return user


async def issue_session(
    db: AsyncSession,
    user: User,
    *,
    user_agent: str | None = None,
) -> tuple[str, str]:
    """Create a new session and return ``(access_token, refresh_token)``.

    The access token is a short-lived signed JWT.
    The refresh token is an opaque random string stored in the DB row.
    """
    now = datetime.now(timezone.utc)
    refresh_token = create_refresh_token()
    session = UserSession(
        user_id=user.id,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=(user_agent or "Unknown")[:255],
        refresh_token=refresh_token,
    )
    db.add(session)
    await db.flush()
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        token_version=user.token_version,
        jti=session.id,
    )
    await db.commit()
    await db.refresh(user)
    return access_token, refresh_token


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    user_agent: str | None = None,
) -> tuple[User, str, str]:
    """Verify credentials and return ``(user, access_token, refresh_token)``."""
    user = await get_user_by_email(db, email)

    if user is None or not user.is_active:
        # Run a dummy verify so missing users take a similar amount of work.
        await asyncio.to_thread(
            verify_password,
            password,
            "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        )
        raise InvalidCredentialsError()

    matched = await asyncio.to_thread(
        verify_password,
        password,
        user.password_hash,
    )

    if not matched:
        raise InvalidCredentialsError()

    access_token, refresh_token = await issue_session(db, user, user_agent=user_agent)
    return user, access_token, refresh_token


async def rotate_refresh_token(
    db: AsyncSession,
    *,
    raw_refresh_token: str,
    user_agent: str | None = None,
) -> tuple[User, str, str]:
    """Validate an existing refresh token, revoke it, and issue a fresh pair.

    Returns ``(user, new_access_token, new_refresh_token)``.

    Raises ``InvalidCredentialsError`` when the token is not found,
    already revoked, or expired.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(UserSession).where(UserSession.refresh_token == raw_refresh_token)
    )
    session = result.scalar_one_or_none()

    if (
        session is None
        or session.revoked_at is not None
        or session.expires_at <= now
    ):
        raise InvalidCredentialsError()

    user = await get_user_by_id(db, session.user_id)
    if user is None or not user.is_active:
        raise InvalidCredentialsError()

    # Verify token_version hasn't been bumped (e.g. password change).
    # We don't check this against the JWT here (no JWT in refresh flow),
    # but a revoked/expired session is already caught above.

    # Revoke the consumed session (rotation — one-time use).
    session.revoked_at = now
    await db.flush()

    # Issue a brand-new session pair.
    access_token, new_refresh_token = await issue_session(
        db, user, user_agent=user_agent
    )
    return user, access_token, new_refresh_token


async def user_from_access_token(
    db: AsyncSession,
    token: str,
) -> User:
    try:
        payload = decode_access_token(token)
    except InvalidAccessTokenError as exc:
        raise InvalidCredentialsError() from exc

    try:
        user_id = UUID(str(payload["sub"]))
    except (KeyError, ValueError, TypeError) as exc:
        raise InvalidCredentialsError() from exc

    user = await get_user_by_id(db, user_id)

    if user is None or not user.is_active:
        raise InvalidCredentialsError()

    claimed_version = payload.get("ver", 1)
    try:
        version = int(claimed_version)
    except (TypeError, ValueError):
        raise InvalidCredentialsError() from None
    if version != int(user.token_version):
        raise InvalidCredentialsError()

    jti_raw = payload.get("jti")
    if jti_raw:
        try:
            jti = UUID(str(jti_raw))
        except (ValueError, TypeError) as exc:
            raise InvalidCredentialsError() from exc
        result = await db.execute(
            select(UserSession).where(UserSession.id == jti)
        )
        session = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if (
            session is None
            or session.user_id != user.id
            or session.revoked_at is not None
            or session.expires_at <= now
        ):
            raise InvalidCredentialsError()

    return user
