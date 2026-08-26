"""
Financial Account ORM model.

An Account represents a financial container owned by a user.

Examples:
    - Bank account
    - Savings account
    - Cash wallet
    - Credit card
    - Investment account
    - Loan account

Important design principle:
    An Account represents the financial instrument/container.
    A Transaction represents movement of money involving that account.

This separation allows the Personal CFO to calculate:
    - Current balances
    - Cash flow
    - Spending
    - Income
    - Debt
    - Net worth
    - Investment allocation

without duplicating financial state across multiple tables.
"""

from __future__ import annotations

from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship


from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.transaction import Transaction
    from backend.app.models.user import User


# =============================================================================
# Account Type
# =============================================================================


class AccountType(str, Enum):
    """
    Supported financial account types.

    Keeping this as an explicit enum prevents arbitrary strings from entering
    the database and gives the application a controlled financial vocabulary.
    """

    BANK = "bank"
    SAVINGS = "savings"
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    LOAN = "loan"


# =============================================================================
# Account Model
# =============================================================================


class Account(BaseModel):
    """
    Financial account owned by a user.
    """

    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            "balance >= 0",
            name="positive_balance",
        ),
    )

    # =========================================================================
    # Ownership
    # =========================================================================

    user_id: Mapped[UUID] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey(
        "users.id",
        ondelete="CASCADE",
    ),
    nullable=False,
    index=True,
)

    # =========================================================================
    # Account Information
    # =========================================================================

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    account_type: Mapped[AccountType] = mapped_column(
        SQLEnum(
            AccountType,
            name="account_type",
            native_enum=True,
            create_constraint=True,
        ),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # =========================================================================
    # Financial State
    # =========================================================================

    balance: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=19,
            scale=4,
        ),
        nullable=False,
        default=Decimal("0.0000"),
        server_default=text("0"),
    )

    # =========================================================================
    # Account Status
    # =========================================================================

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # =========================================================================
    # Relationships
    # =========================================================================

    user: Mapped["User"] = relationship(
        "User",
        back_populates="accounts",
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # =========================================================================
    # Representation
    # =========================================================================

    def __repr__(self) -> str:
        """
        Safe developer representation.

        We intentionally avoid logging the account balance here because
        financial information should not accidentally appear in application
        logs.
        """

        return (
            f"<Account("
            f"id={self.id!s}, "
            f"name={self.name!r}, "
            f"type={self.account_type.value!r}, "
            f"user_id={self.user_id!s}"
            f")>"
        )
