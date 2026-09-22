"""Schemas for profile, settings, preferences, and security."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.schemas.auth import _normalize_email, _normalize_name, _validate_password


Density = Literal["comfortable", "compact"]
RiskTolerance = Literal["conservative", "moderate", "aggressive"]


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    name: str
    email: str
    createdAt: datetime = Field(
        validation_alias="created_at",
        serialization_alias="createdAt",
    )


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    email: str | None = Field(default=None, min_length=3, max_length=320)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _normalize_name(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _normalize_email(value)


class WorkspaceSettingsOut(BaseModel):
    density: Density
    notifyBudget: bool
    notifyUpcoming: bool
    notifyGoals: bool


class WorkspaceSettingsUpdateRequest(BaseModel):
    density: Density | None = None
    notifyBudget: bool | None = None
    notifyUpcoming: bool | None = None
    notifyGoals: bool | None = None


class FinancialPreferencesOut(BaseModel):
    currency: str
    riskTolerance: RiskTolerance
    monthlySavingsTargetPct: float
    emergencyFundMonths: int


class FinancialPreferencesUpdateRequest(BaseModel):
    riskTolerance: RiskTolerance | None = None
    monthlySavingsTargetPct: Decimal | None = Field(default=None, ge=0, le=100)
    emergencyFundMonths: int | None = Field(default=None, ge=1, le=24)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password(value)


class PasswordChangeData(BaseModel):
    token: str
    user: ProfileOut


class SessionOut(BaseModel):
    id: UUID
    createdAt: datetime
    expiresAt: datetime
    userAgent: str
    current: bool


class SecurityOut(BaseModel):
    email: str
    passwordChangedAt: datetime | None
    sessions: list[SessionOut]


class ItemResponse(BaseModel):
    success: bool = True
    message: str
    data: object
