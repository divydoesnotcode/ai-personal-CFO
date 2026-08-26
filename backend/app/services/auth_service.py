"""Authentication service.

Business logic for registration and sign-in. Routers should stay thin.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.user import User
from backend.app.utils.security import (
    create_access_token,
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


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> tuple[User, str]:
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

    token = create_access_token(user_id=user.id, email=user.email)
    return user, token


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

    return user
