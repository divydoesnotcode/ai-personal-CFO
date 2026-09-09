"""Profile, settings, preferences, and security HTTP routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import extract_access_token, get_current_user, token_jti
from backend.app.config import settings
from backend.app.database import get_db_session
from backend.app.models.user import User
from backend.app.models.user_preference import UserPreference
from backend.app.schemas.account import (
    FinancialPreferencesOut,
    FinancialPreferencesUpdateRequest,
    ItemResponse,
    PasswordChangeData,
    PasswordChangeRequest,
    ProfileOut,
    ProfileUpdateRequest,
    SecurityOut,
    SessionOut,
    WorkspaceSettingsOut,
    WorkspaceSettingsUpdateRequest,
)
from backend.app.services import account_service
from backend.app.services.account_service import AccountError
from backend.app.services.auth_service import EmailAlreadyRegisteredError, InvalidCredentialsError
from backend.app.utils.security import ACCESS_TOKEN_COOKIE

router = APIRouter(prefix="/api", tags=["Account"])


def _http_error(status_code: int, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=message)


def _profile(user: User) -> ProfileOut:
    return ProfileOut.model_validate(user)


def _settings(pref: UserPreference) -> WorkspaceSettingsOut:
    density = pref.density if pref.density in ("comfortable", "compact") else "comfortable"
    return WorkspaceSettingsOut(
        density=density,  # type: ignore[arg-type]
        notifyBudget=pref.notify_budget,
        notifyUpcoming=pref.notify_upcoming,
        notifyGoals=pref.notify_goals,
    )


def _preferences(pref: UserPreference) -> FinancialPreferencesOut:
    risk = pref.risk_tolerance if pref.risk_tolerance in (
        "conservative",
        "moderate",
        "aggressive",
    ) else "moderate"
    return FinancialPreferencesOut(
        currency=pref.currency or "INR",
        riskTolerance=risk,  # type: ignore[arg-type]
        monthlySavingsTargetPct=float(pref.monthly_savings_target_pct),
        emergencyFundMonths=int(pref.emergency_fund_months),
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path="/",
        secure=settings.ENVIRONMENT.lower() == "production",
        httponly=True,
        samesite="lax",
    )


@router.get("/profile", response_model=ItemResponse)
async def get_profile(user: User = Depends(get_current_user)) -> ItemResponse:
    return ItemResponse(
        success=True,
        message="Profile loaded",
        data=_profile(user).model_dump(mode="json", by_alias=True),
    )


@router.patch("/profile", response_model=ItemResponse)
async def patch_profile(
    payload: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        user = await account_service.update_profile(db, user, payload)
    except AccountError as exc:
        raise _http_error(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    except EmailAlreadyRegisteredError:
        raise _http_error(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists",
        ) from None
    return ItemResponse(
        success=True,
        message="Profile updated",
        data=_profile(user).model_dump(mode="json", by_alias=True),
    )


@router.get("/settings", response_model=ItemResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    pref = await account_service.get_or_create_preferences(db, user)
    return ItemResponse(
        success=True,
        message="Settings loaded",
        data=_settings(pref).model_dump(mode="json"),
    )


@router.patch("/settings", response_model=ItemResponse)
async def patch_settings(
    payload: WorkspaceSettingsUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        pref = await account_service.update_settings(db, user, payload)
    except AccountError as exc:
        raise _http_error(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    return ItemResponse(
        success=True,
        message="Settings saved",
        data=_settings(pref).model_dump(mode="json"),
    )


@router.get("/preferences", response_model=ItemResponse)
async def get_preferences(
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    pref = await account_service.get_or_create_preferences(db, user)
    return ItemResponse(
        success=True,
        message="Preferences loaded",
        data=_preferences(pref).model_dump(mode="json"),
    )


@router.patch("/preferences", response_model=ItemResponse)
async def patch_preferences(
    payload: FinancialPreferencesUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        pref = await account_service.update_preferences(db, user, payload)
    except AccountError as exc:
        raise _http_error(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    return ItemResponse(
        success=True,
        message="Preferences saved",
        data=_preferences(pref).model_dump(mode="json"),
    )


@router.get("/security", response_model=ItemResponse)
async def get_security(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    current = token_jti(extract_access_token(request))
    rows = await account_service.list_active_sessions(db, user, current_jti=current)
    return ItemResponse(
        success=True,
        message="Security loaded",
        data=SecurityOut(
            email=user.email,
            passwordChangedAt=user.password_changed_at,
            sessions=[
                SessionOut(
                    id=session.id,
                    createdAt=session.created_at,
                    expiresAt=session.expires_at,
                    userAgent=session.user_agent,
                    current=is_current,
                )
                for session, is_current in rows
            ],
        ).model_dump(mode="json"),
    )


@router.post("/security/password", response_model=ItemResponse)
async def post_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    try:
        token = await account_service.change_password(
            db,
            user,
            current_password=payload.current_password,
            new_password=payload.new_password,
            user_agent=request.headers.get("user-agent"),
        )
    except InvalidCredentialsError:
        raise _http_error(
            status.HTTP_401_UNAUTHORIZED,
            "Current password is incorrect",
        ) from None
    except AccountError as exc:
        raise _http_error(status.HTTP_400_BAD_REQUEST, exc.message) from exc

    return ItemResponse(
        success=True,
        message="Password updated",
        data=PasswordChangeData(
            token=token,
            user=_profile(user),
        ).model_dump(mode="json", by_alias=True),
    )


@router.post("/security/sessions/{session_id}/revoke", response_model=ItemResponse)
async def post_revoke_session(
    session_id: UUID,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    current = token_jti(extract_access_token(request))
    try:
        await account_service.revoke_session(db, user, session_id)
    except AccountError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, exc.message) from exc

    signed_out = current is not None and session_id == current
    if signed_out:
        _clear_cookie(response)
    return ItemResponse(
        success=True,
        message="Signed out this device" if signed_out else "Session revoked",
        data={"signedOut": signed_out, "sessionId": str(session_id)},
    )


@router.post("/security/signout-all", response_model=ItemResponse)
async def post_signout_all(
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    await account_service.revoke_all_sessions(db, user)
    _clear_cookie(response)
    return ItemResponse(
        success=True,
        message="Signed out of all devices",
        data={"signedOut": True},
    )
