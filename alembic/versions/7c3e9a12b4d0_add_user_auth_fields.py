"""add user name and password hash

Revision ID: 7c3e9a12b4d0
Revises: e82406938a0e
Create Date: 2026-08-26 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c3e9a12b4d0"
down_revision: Union[str, Sequence[str], None] = "e82406938a0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply this migration."""

    op.add_column(
        "users",
        sa.Column("name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(length=255), nullable=True),
    )

    op.execute(
        sa.text("UPDATE users SET name = 'User' WHERE name IS NULL")
    )
    op.execute(
        sa.text(
            "UPDATE users SET password_hash = 'invalid' WHERE password_hash IS NULL"
        )
    )

    op.alter_column(
        "users",
        "name",
        existing_type=sa.String(length=150),
        nullable=False,
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )


def downgrade() -> None:
    """Reverse this migration."""

    op.drop_column("users", "password_hash")
    op.drop_column("users", "name")
