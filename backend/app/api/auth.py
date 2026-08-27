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
    user_from_access_token,
)
from backend.app.utils.security import (
    ACCESS_TOKEN_COOKIE,
    access_token_cookie_max_age,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
        },
    )


def _set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=access_token_cookie_max_age(),
        path="/",
    )


def _extract_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        if token:
            return token

    cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if cookie_token:
        return cookie_token

    return None


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {
            "description": "Email already registered",
        },
        422: {
            "description": "Validation error",
        },
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
        401: {
            "description": "Invalid credentials",
        },
        422: {
            "description": "Validation error",
        },
    },
)
async def signin(
    payload: SigninRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> SigninResponse | JSONResponse:
    try:
        user, token = await authenticate_user(
            db,
            email=payload.email,
            password=payload.password,
        )
    except InvalidCredentialsError:
        return _error(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
        )

    _set_access_cookie(response, token)

    return SigninResponse(
        success=True,
        message="Signed in successfully",
        data=SigninData(
            user=PublicUser.model_validate(user),
            token=token,
        ),
    )


@router.get(
    "/me",
    response_model=SignupResponse,
    responses={
        401: {
            "description": "Missing or invalid token",
        },
    },
)
async def me(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> SignupResponse | JSONResponse:
    token = _extract_token(request)
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
