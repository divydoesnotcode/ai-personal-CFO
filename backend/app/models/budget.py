"""Monthly category budget ORM model."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.category import Category
    from backend.app.models.user import User


class Budget(BaseModel):
    """User-owned monthly spending ceiling for one category."""

    __tablename__ = "budgets"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "category_id",
            name="uq_budgets_user_category",
        ),
        CheckConstraint(
            "monthly_limit > 0",
            name="positive_monthly_limit",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    monthly_limit: Mapped[Decimal] = mapped_column(
        Numeric(precision=19, scale=4),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default=text("'INR'"),
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="budgets",
    )

    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="budgets",
    )

    def __repr__(self) -> str:
        return (
            f"<Budget(id={self.id!s}, user_id={self.user_id!s}, "
            f"category_id={self.category_id!s})>"
        )
