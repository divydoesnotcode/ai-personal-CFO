"""add budgets table and system categories

Revision ID: c4f8a21d9e70
Revises: 7c3e9a12b4d0
Create Date: 2026-09-08 16:50:00.000000

"""
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "c4f8a21d9e70"
down_revision: Union[str, Sequence[str], None] = "7c3e9a12b4d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SYSTEM_CATEGORIES = (
    "Housing",
    "Food",
    "Transportation",
    "Entertainment",
    "Shopping",
    "Other",
    "Income",
)


def upgrade() -> None:
    """Apply this migration."""
    op.create_table(
        "budgets",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("monthly_limit", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default=sa.text("'INR'"), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("monthly_limit > 0", name=op.f("ck_budgets_positive_monthly_limit")),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], name=op.f("fk_budgets_category_id_categories"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_budgets_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_budgets")),
        sa.UniqueConstraint("user_id", "category_id", name="uq_budgets_user_category"),
    )
    op.create_index(op.f("ix_budgets_category_id"), "budgets", ["category_id"], unique=False)
    op.create_index(op.f("ix_budgets_user_id"), "budgets", ["user_id"], unique=False)

    categories = sa.table(
        "categories",
        sa.column("id", sa.UUID()),
        sa.column("user_id", sa.UUID()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("parent_id", sa.UUID()),
        sa.column("is_active", sa.Boolean()),
        sa.column("is_system", sa.Boolean()),
    )
    op.bulk_insert(
        categories,
        [
            {
                "id": uuid4(),
                "user_id": None,
                "name": name,
                "description": None,
                "parent_id": None,
                "is_active": True,
                "is_system": True,
            }
            for name in SYSTEM_CATEGORIES
        ],
    )


def downgrade() -> None:
    """Reverse this migration."""
    op.execute("DELETE FROM categories WHERE is_system IS TRUE AND user_id IS NULL")
    op.drop_index(op.f("ix_budgets_user_id"), table_name="budgets")
    op.drop_index(op.f("ix_budgets_category_id"), table_name="budgets")
    op.drop_table("budgets")
