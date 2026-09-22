"""Workspace settings and financial preferences for a user."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User

DENSITY_VALUES = ("comfortable", "compact")
RISK_VALUES = ("conservative", "moderate", "aggressive")


class UserPreference(BaseModel):
    """One row per user. Created on first read with product defaults."""

    __tablename__ = "user_preferences"

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_preferences_user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    density: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="comfortable",
        server_default=text("'comfortable'"),
    )

    notify_budget: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    notify_upcoming: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    notify_goals: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default=text("'INR'"),
    )

    risk_tolerance: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="moderate",
        server_default=text("'moderate'"),
    )

    monthly_savings_target_pct: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=False,
        default=Decimal("20.00"),
        server_default=text("20"),
    )

    emergency_fund_months: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=6,
        server_default=text("6"),
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="preferences",
    )

    def __repr__(self) -> str:
        return f"<UserPreference(user_id={self.user_id!s})>"
