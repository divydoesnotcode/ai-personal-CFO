

"""User ORM model for AI Personal CFO."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, List as TypingList


if TYPE_CHECKING:
    from backend.app.models.financial_goal import FinancialGoal  # noqa:F401
    