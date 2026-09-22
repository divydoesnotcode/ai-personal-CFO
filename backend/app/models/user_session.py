"""Persisted sign-in session bound to a JWT jti."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User


class UserSession(BaseModel):
    """One browser/device session. `id` is stored as the JWT `jti`.

    Fields
    ------
    refresh_token : str
        Opaque token (``secrets.token_urlsafe(48)``) stored in the
        ``cfo_refresh_token`` HttpOnly cookie. Used to issue a new
        short-lived access token via ``POST /auth/refresh``.
    """

    __tablename__ = "user_sessions"

    __table_args__ = (
        UniqueConstraint("refresh_token", name="uq_user_sessions_refresh_token"),
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    user_agent: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Unknown",
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    refresh_token: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="sessions",
    )

    def __repr__(self) -> str:
        return f"<UserSession(id={self.id!s}, user_id={self.user_id!s})>"
