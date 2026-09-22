"""add refresh_token to user_sessions

Revision ID: f1a3b9c2d5e8
Revises: d7b1c4e8a092
Create Date: 2026-09-09 07:00:00.000000

Adds an opaque ``refresh_token`` column (VARCHAR 128, unique, not null)
to ``user_sessions``.  Existing rows receive a one-time generated value
via a SQL UPDATE so the NOT NULL constraint can be applied immediately.
"""
from __future__ import annotations

import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


revision: str = "f1a3b9c2d5e8"
down_revision: Union[str, Sequence[str], None] = "d7b1c4e8a092"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply this migration."""
    # 1. Add the column as nullable first so existing rows don't immediately fail.
    op.add_column(
        "user_sessions",
        sa.Column(
            "refresh_token",
            sa.String(length=128),
            nullable=True,
        ),
    )

    # 2. Back-fill existing sessions with a unique opaque token.
    #    We do this in Python rather than relying on gen_random_uuid() so
    #    the token format matches what the application generates at runtime.
    conn = op.get_bind()
    rows = conn.execute(text("SELECT id FROM user_sessions")).fetchall()
    for (session_id,) in rows:
        token = secrets.token_urlsafe(48)
        conn.execute(
            text(
                "UPDATE user_sessions SET refresh_token = :token WHERE id = :id"
            ),
            {"token": token, "id": str(session_id)},
        )

    # 3. Tighten: NOT NULL + unique index.
    op.alter_column("user_sessions", "refresh_token", nullable=False)
    op.create_unique_constraint(
        "uq_user_sessions_refresh_token",
        "user_sessions",
        ["refresh_token"],
    )
    op.create_index(
        "ix_user_sessions_refresh_token",
        "user_sessions",
        ["refresh_token"],
        unique=True,
    )


def downgrade() -> None:
    """Reverse this migration."""
    op.drop_index("ix_user_sessions_refresh_token", table_name="user_sessions")
    op.drop_constraint(
        "uq_user_sessions_refresh_token",
        "user_sessions",
        type_="unique",
    )
    op.drop_column("user_sessions", "refresh_token")
