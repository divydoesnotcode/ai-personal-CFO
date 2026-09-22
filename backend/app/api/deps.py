"""Shared FastAPI dependencies."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db_session
from backend.app.models.user import User
from backend.app.services.auth_service import (
    InvalidCredentialsError,
    user_from_access_token,
)
from backend.app.utils.security import (
    ACCESS_TOKEN_COOKIE,
    InvalidAccessTokenError,
    decode_access_token,
)


def extract_access_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        if token:
            return token

    cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if cookie_token:
        return cookie_token

    return None


def token_jti(token: str | None) -> UUID | None:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except InvalidAccessTokenError:
        return None
    raw = payload.get("jti")
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except (ValueError, TypeError):
        return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> User:
    token = extract_access_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        return await user_from_access_token(db, token)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        ) from None
