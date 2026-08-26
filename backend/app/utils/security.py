"""Password hashing and JWT helpers.

Passwords are hashed with Argon2. JWTs are signed with the application
SECRET_KEY. This module must never log passwords, hashes, or tokens.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jwt import ExpiredSignatureError, InvalidTokenError

from backend.app.config import settings

_hasher = PasswordHasher()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_COOKIE = "cfo_access_token"


class InvalidAccessTokenError(Exception):
    """Raised when a JWT is missing, expired, or malformed."""


def hash_password(password: str) -> str:
    """Return an Argon2 hash for the given password."""

    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when `password` matches `password_hash`."""

    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(*, user_id: UUID, email: str) -> str:
    """Create a signed JWT for an authenticated user."""

    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate an access token."""

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
    except ExpiredSignatureError as exc:
        raise InvalidAccessTokenError("Access token has expired.") from exc
    except InvalidTokenError as exc:
        raise InvalidAccessTokenError("Access token is invalid.") from exc

    subject = payload.get("sub")
    if not subject:
        raise InvalidAccessTokenError("Access token is invalid.")

    return payload


def access_token_cookie_max_age() -> int:
    """Cookie max-age in seconds."""

    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
