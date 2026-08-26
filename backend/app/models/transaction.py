"""
Transaction ORM model.

A Transaction represents one financial ledger event associated with an
Account.

Examples:
    - Salary received
    - Grocery purchase
    - Rent payment
    - Credit-card payment
    - Bank transfer
    - Refund
    - Interest received
    - Loan repayment

Design principles
-----------------
1. Money is represented using Decimal/Numeric, never float.
2. Transactions are immutable financial events in principle.
3. The transaction type describes the economic nature of the event.
4. Transfers are represented explicitly rather than disguised as expenses.
5. Transaction dates are timezone-aware.
6. Raw financial data is kept separate from AI-generated interpretation.
7. Database constraints enforce fundamental invariants.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
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
    from backend.app.models.account import Account
    from backend.app.models.category import Category


# =============================================================================
# Enumerations
# =============================================================================


class TransactionType(str, Enum):
    """
    Economic classification of a transaction.

    INCOME:
        Money received that increases the user's financial position.

    EXPENSE:
        Money spent on goods/services and consumed by the user.

    TRANSFER:
        Movement between accounts owned by the same user.

    REFUND:
        Money returned from a previous expense.

    ADJUSTMENT:
        Manual/accounting correction.

    INTEREST:
        Interest earned or charged.

    FEE:
        Financial/service fee charged to the user.

    LOAN_PAYMENT:
        Payment toward a liability.

    DIVIDEND:
        Investment dividend received.
    """

    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"
    INTEREST = "interest"
    FEE = "fee"
    LOAN_PAYMENT = "loan_payment"
    DIVIDEND = "dividend"


class TransactionStatus(str, Enum):
    """
    Lifecycle status of a transaction.
    """

    PENDING = "pending"
    POSTED = "posted"
    CANCELLED = "cancelled"


# =============================================================================
# Transaction Model
# =============================================================================


class Transaction(BaseModel):
    """
    Financial ledger event.

    Amount semantics
    ----------------
    `amount` is always stored as a POSITIVE absolute monetary value.

    Direction is represented by `transaction_type`.

    Example:

        Salary:
            amount = 100000
            type   = INCOME

        Grocery:
            amount = 2500
            type   = EXPENSE

    We deliberately do NOT store expenses as negative numbers.

    This prevents a common source of accounting bugs where sign and transaction
    type become duplicated representations of the same concept.
    """

    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="positive_amount",
        ),
        Index(
            "ix_transactions_account_date",
            "account_id",
            "transaction_date",
        ),
        Index(
            "ix_transactions_user_date",
            "user_id",
            "transaction_date",
        ),
        Index(
            "ix_transactions_category_date",
            "category_id",
            "transaction_date",
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
    # Account
    # =========================================================================

    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "accounts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # =========================================================================
    # Transaction Classification
    # =========================================================================

    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(
            TransactionType,
            name="transaction_type",
            native_enum=True,
            create_constraint=True,
        ),
        nullable=False,
    )

    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(
            TransactionStatus,
            name="transaction_status",
            native_enum=True,
            create_constraint=True,
        ),
        nullable=False,
        default=TransactionStatus.POSTED,
        server_default=text("'posted'"),
    )

    # =========================================================================
    # Monetary Value
    # =========================================================================

    amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=19,
            scale=4,
        ),
        nullable=False,
    )

    # =========================================================================
    # Currency
    # =========================================================================

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default=text("'INR'"),
    )

    # =========================================================================
    # Transaction Details
    # =========================================================================

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    merchant_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # =========================================================================
    # Transaction Time
    # =========================================================================

    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # =========================================================================
    # Categorization
    # =========================================================================

    category_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "categories.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # =========================================================================
    # Transfer Support
    # =========================================================================

    transfer_account_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "accounts.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # =========================================================================
    # External Reference
    # =========================================================================

    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # =========================================================================
    # Relationships
    # =========================================================================

    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="transactions",
        foreign_keys=[account_id],
    )

    category: Mapped["Category | None"] = relationship(
        "Category",
        back_populates="transactions",
    )

    transfer_account: Mapped["Account | None"] = relationship(
        "Account",
        foreign_keys=[transfer_account_id],
    )

    # =========================================================================
    # Representation
    # =========================================================================

    def __repr__(self) -> str:
        """
        Safe developer representation.

        Do not include descriptions, merchant names, or other potentially
        sensitive financial information in logs by default.
        """

        return (
            f"<Transaction("
            f"id={self.id!s}, "
            f"type={self.transaction_type.value!r}, "
            f"amount={self.amount!s}, "
            f"currency={self.currency!r}, "
            f"date={self.transaction_date!r}"
            f")>"
        )
