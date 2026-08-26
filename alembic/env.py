"""
Alembic migration environment.

This module configures Alembic to work with the application's asynchronous
SQLAlchemy engine and ORM metadata.

Responsibilities:
    - Load application configuration.
    - Expose SQLAlchemy model metadata to Alembic.
    - Run migrations in offline mode.
    - Run migrations in online mode.

Important:
    Alembic migrations remain synchronous from Alembic's perspective while
    using SQLAlchemy's async PostgreSQL driver through an async connection.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from backend.app.config import settings
from backend.app.models import Base

# Import models here as they are created.
#
# Alembic needs these imports so SQLAlchemy knows about all tables before
# autogenerate is executed.
#
# Example:
#
# from backend.app.models.user import User
# from backend.app.models.account import Account
# from backend.app.models.transaction import Transaction


# =============================================================================
# Alembic Configuration
# =============================================================================

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# =============================================================================
# SQLAlchemy Metadata
# =============================================================================

target_metadata = Base.metadata


# =============================================================================
# Database URL
# =============================================================================

config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("%", "%%"),
)


# =============================================================================
# Offline Migration
# =============================================================================

def run_migrations_offline() -> None:
    """
    Run migrations without creating a database connection.

    Useful for generating SQL scripts that can be reviewed or executed
    manually.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# =============================================================================
# Online Migration
# =============================================================================

def do_run_migrations(connection: Connection) -> None:
    """
    Configure Alembic using an active synchronous connection.
    """

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Create an asynchronous SQLAlchemy engine and execute Alembic migrations.
    """

    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations using the application's asynchronous database driver.
    """

    asyncio.run(run_async_migrations())


# =============================================================================
# Entry Point
# =============================================================================

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
