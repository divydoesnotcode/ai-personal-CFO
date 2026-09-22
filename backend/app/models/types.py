"""Helpers for PostgreSQL-native SQLAlchemy enums.

Existing Alembic enums store member *names* (BANK, INCOME), while the
Python enums use lowercase *values* (bank, income). SQLAlchemy must bind
and result-map using names so inserts match the live database.
"""

from __future__ import annotations

from enum import Enum


def pg_enum_names(enum_cls: type[Enum]) -> list[str]:
    return [member.name for member in enum_cls]
