"""Authentication HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.database import get_db_session
from backend.app.schemas.auth import (
    PublicUser,
    SigninData,
    SigninRequest,
    SigninResponse,
    SignupRequest,
    SignupResponse,
)
from backend.app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    authenticate_user,
    register_user,
    rotate_refresh_token,
    user_from_access_token,
)
from backend.app.api.deps import extract_access_token, token_jti
from backend.app.services.account_service import revoke_current_session
from backend.app.utils.security import (
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    access_token_cookie_max_age,
    refresh_token_cookie_max_age,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

_IS_PROD = settings.ENVIRONMENT.lower() == "production"


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
        },
    )


def _set_access_cookie(response: Response, token: str) -> None:
    """Store the short-lived access token in an HttpOnly cookie (fallback for /auth/me)."""
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        max_age=access_token_cookie_max_age(),
        path="/",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Store the long-lived refresh token in an HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        max_age=refresh_token_cookie_max_age(),
        path="/api/auth",  # Scoped — only sent to auth endpoints
    )


def _clear_auth_cookies(response: Response) -> None:
    """Delete both auth cookies."""
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=_IS_PROD,
    )
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=_IS_PROD,
    )


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Email already registered"},
        422: {"description": "Validation error"},
    },
)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db_session),
) -> SignupResponse | JSONResponse:
    try:
        user = await register_user(
            db,
            name=payload.name,
            email=payload.email,
            password=payload.password,
        )
    except EmailAlreadyRegisteredError:
        return _error(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists",
        )

    return SignupResponse(
        success=True,
        message="Account created successfully",
        data=PublicUser.model_validate(user),
    )


@router.post(
    "/signin",
    response_model=SigninResponse,
    responses={
        401: {"description": "Invalid credentials"},
        422: {"description": "Validation error"},
    },
)
async def signin(
    payload: SigninRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> SigninResponse | JSONResponse:
    try:
        user, access_token, refresh_token = await authenticate_user(
            db,
            email=payload.email,
            password=payload.password,
            user_agent=request.headers.get("user-agent"),
        )
    except InvalidCredentialsError:
        return _error(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
        )

    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, refresh_token)

    # Return the access token in the JSON body so the client can hold it
    # in memory (never localStorage).
    return SigninResponse(
        success=True,
        message="Signed in successfully",
        data=SigninData(
            user=PublicUser.model_validate(user),
            token=access_token,
        ),
    )


@router.post(
    "/refresh",
    response_model=SigninResponse,
    responses={
        401: {"description": "Missing, revoked, or expired refresh token"},
    },
)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> SigninResponse | JSONResponse:
    """Issue a new access token + rotated refresh token.

    The client must present the ``cfo_refresh_token`` HttpOnly cookie.
    The old session is revoked and a new one is created (rotation).
    """
    raw_refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not raw_refresh:
        return _error(status.HTTP_401_UNAUTHORIZED, "Authentication required")

    try:
        user, access_token, new_refresh_token = await rotate_refresh_token(
            db,
            raw_refresh_token=raw_refresh,
            user_agent=request.headers.get("user-agent"),
        )
    except InvalidCredentialsError:
        _clear_auth_cookies(response)
        return _error(status.HTTP_401_UNAUTHORIZED, "Session expired — please sign in again")

    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, new_refresh_token)

    return SigninResponse(
        success=True,
        message="Token refreshed",
        data=SigninData(
            user=PublicUser.model_validate(user),
            token=access_token,
        ),
    )


@router.get(
    "/me",
    response_model=SignupResponse,
    responses={
        401: {"description": "Missing or invalid token"},
    },
)
async def me(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> SignupResponse | JSONResponse:
    """Return the authenticated user.

    Token priority: ``Authorization: Bearer <token>`` header first,
    then the ``cfo_access_token`` HttpOnly cookie as fallback (for the
    initial page-load /auth/me call where the in-memory token hasn't
    been restored yet).
    """
    token = extract_access_token(request)
    if not token:
        return _error(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required",
        )

    try:
        user = await user_from_access_token(db, token)
    except InvalidCredentialsError:
        return _error(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required",
        )

    return SignupResponse(
        success=True,
        message="Authenticated",
        data=PublicUser.model_validate(user),
    )


@router.post(
    "/signout",
    response_model=None,
    responses={
        401: {"description": "Missing or invalid token"},
    },
)
async def signout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, object] | JSONResponse:
    """Revoke the current session and clear both auth cookies."""
    token = extract_access_token(request)

    # Best-effort: revoke DB session if the access token is still valid.
    if token:
        try:
            await user_from_access_token(db, token)
            await revoke_current_session(db, jti=token_jti(token))
        except InvalidCredentialsError:
            pass  # Token already expired — still clear cookies

    # Also revoke the refresh-token session if we can look it up.
    raw_refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if raw_refresh:
        from sqlalchemy import select
        from backend.app.models.user_session import UserSession
        from datetime import timezone
        from datetime import datetime

        result = await db.execute(
            select(UserSession).where(UserSession.refresh_token == raw_refresh)
        )
        session = result.scalar_one_or_none()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    _clear_auth_cookies(response)
    return {
        "success": True,
        "message": "Signed out",
        "data": {"signedOut": True},
    }
