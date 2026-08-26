"""
Financial Goal ORM model.

A FinancialGoal represents a measurable financial objective owned by a user.

Examples:
    - Emergency fund
    - MBA fund
    - House down payment
    - Car purchase
    - Travel
    - Investment target
    - Debt payoff
    - General savings

The model stores the goal's financial state and target conditions.

It does NOT calculate:
    - Monthly contribution requirements
    - Probability of achieving the goal
    - Investment returns
    - Financial recommendations

Those belong to the financial planning/service layer.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User


# =============================================================================
# Goal Type
# =============================================================================


class GoalType(str, Enum):
    """
    Classification of a financial goal.
    """

    EMERGENCY_FUND = "emergency_fund"
    EDUCATION = "education"
    HOME = "home"
    VEHICLE = "vehicle"
    TRAVEL = "travel"
    INVESTMENT = "investment"
    DEBT_PAYOFF = "debt_payoff"
    SAVINGS = "savings"
    OTHER = "other"


# =============================================================================
# Goal Status
# =============================================================================


class GoalStatus(str, Enum):
    """
    Lifecycle status of a financial goal.
    """

    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


# =============================================================================
# Financial Goal
# =============================================================================


class FinancialGoal(BaseModel):
    """
    User-owned financial objective.

    Example:

        Goal:
            MBA Fund

        Target:
            ₹3,000,000

        Current:
            ₹850,000

        Deadline:
            2029-08-01

    Monetary values use Decimal/Numeric to preserve exact financial precision.
    """

    __tablename__ = "financial_goals"

    __table_args__ = (
        CheckConstraint(
            "target_amount > 0",
            name="positive_target_amount",
        ),
        CheckConstraint(
            "current_amount >= 0",
            name="non_negative_current_amount",
        ),
        Index(
            "ix_financial_goals_user_status",
            "user_id",
            "status",
        ),
    )

    # =========================================================================
    # Ownership
    # =========================================================================

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # =========================================================================
    # Goal Information
    # =========================================================================

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    goal_type: Mapped[GoalType] = mapped_column(
        SQLEnum(
            GoalType,
            name="goal_type",
            native_enum=True,
            create_constraint=True,
        ),
        nullable=False,
    )

    status: Mapped[GoalStatus] = mapped_column(
        SQLEnum(
            GoalStatus,
            name="goal_status",
            native_enum=True,
            create_constraint=True,
        ),
        nullable=False,
        default=GoalStatus.ACTIVE,
        server_default=text("'active'"),
    )

    # =========================================================================
    # Financial Target
    # =========================================================================

    target_amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=19,
            scale=4,
        ),
        nullable=False,
    )

    current_amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=19,
            scale=4,
        ),
        nullable=False,
        default=Decimal("0.0000"),
        server_default=text("0"),
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default=text("'INR'"),
    )

    # =========================================================================
    # Deadline
    # =========================================================================

    target_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    # =========================================================================
    # Goal Configuration
    # =========================================================================

    is_priority: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    # =========================================================================
    # Relationships
    # =========================================================================

    user: Mapped["User"] = relationship(
        "User",
        back_populates="financial_goals",
    )

    # =========================================================================
    # Representation
    # =========================================================================

    def __repr__(self) -> str:
        """
        Safe developer representation.

        Monetary values are intentionally omitted from logs.
        """

        return (
            f"<FinancialGoal("
            f"id={self.id!s}, "
            f"name={self.name!r}, "
            f"type={self.goal_type.value!r}, "
            f"status={self.status.value!r}, "
            f"target_date={self.target_date!r}"
            f")>"
        )
