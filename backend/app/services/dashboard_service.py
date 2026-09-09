"""Assemble the signed-in dashboard from the user's ledger."""

from __future__ import annotations

import calendar
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.account import Account, AccountType
from backend.app.models.budget import Budget
from backend.app.models.financial_goal import FinancialGoal, GoalStatus
from backend.app.models.transaction import (
    Transaction,
    TransactionStatus,
    TransactionType,
)
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    BudgetCategory,
    BudgetStatus,
    CashFlowPoint,
    CashFlowRange,
    DashboardPayload,
    Debt,
    DebtItem,
    Delta,
    FinancialHealth,
    GoalCard,
    HealthPillar,
    Insight,
    Investments,
    InvestmentSlice,
    Metric,
    NotificationItem,
    Overview,
    RecentTransaction,
    Recommendation,
    SectionError,
    SpendingCategory,
    UpcomingItem,
)
from backend.app.services.ledger_service import (
    INFLOW_TYPES,
    LIABILITY_TYPES,
    OUTFLOW_TYPES,
    money,
    signed_amount,
)

logger = logging.getLogger(__name__)

CASH_FLOW_RANGES: tuple[CashFlowRange, ...] = ("7D", "30D", "3M", "6M", "1Y")
INR = Decimal("0.01")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_float(value: Decimal | int | float) -> float:
    return float(money(value))


def _pct_change(current: Decimal, previous: Decimal) -> float:
    if previous == 0:
        if current == 0:
            return 0.0
        return 100.0 if current > 0 else -100.0
    return float(((current - previous) / abs(previous) * 100).quantize(INR))


def _month_start(moment: datetime) -> datetime:
    return moment.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(moment: datetime, months: int) -> datetime:
    year = moment.year + (moment.month - 1 + months) // 12
    month = (moment.month - 1 + months) % 12 + 1
    day = min(moment.day, calendar.monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


def _iso(moment: datetime | date) -> str:
    if isinstance(moment, datetime):
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        return moment.isoformat()
    return moment.isoformat()


def _empty_cash_flow() -> dict[str, list[CashFlowPoint]]:
    return {key: [] for key in CASH_FLOW_RANGES}


def _empty_investments() -> Investments:
    return Investments(
        connected=False,
        value=0,
        gain=0,
        gainPct=0,
        slices=[],
    )


def _empty_debt() -> Debt:
    return Debt(hasDebt=False, outstanding=0, monthlyPayments=0, items=[])


def empty_dashboard(*, generated_at: datetime | None = None) -> DashboardPayload:
    return DashboardPayload(
        hasLedger=False,
        source="live",
        generatedAt=_iso(generated_at or _now()),
        overview=None,
        financialHealth=None,
        cashFlow=_empty_cash_flow(),
        spending=[],
        budget=None,
        insights=[],
        goals=[],
        upcoming=[],
        recentTransactions=[],
        investments=_empty_investments(),
        debt=_empty_debt(),
        recommendations=[],
        notifications=[],
        errors={},
    )


def _is_inflow(tx: Transaction) -> bool:
    return tx.transaction_type in INFLOW_TYPES


def _is_outflow(tx: Transaction) -> bool:
    return tx.transaction_type in OUTFLOW_TYPES


def _day_label(key: date) -> str:
    return f"{key.day} {key.strftime('%b')}"


def _sum_flow(
    transactions: list[Transaction],
    start: datetime,
    end: datetime,
) -> tuple[Decimal, Decimal]:
    income = Decimal("0")
    expenses = Decimal("0")
    for tx in transactions:
        if tx.status != TransactionStatus.POSTED:
            continue
        if not (start <= tx.transaction_date < end):
            continue
        if _is_inflow(tx):
            income += tx.amount
        elif _is_outflow(tx):
            expenses += tx.amount
    return money(income), money(expenses)


def _series(
    transactions: list[Transaction],
    *,
    start: datetime,
    end: datetime,
    monthly: bool,
) -> list[CashFlowPoint]:
    buckets: dict[date, tuple[Decimal, Decimal]] = {}
    cursor = start
    while cursor < end:
        key = date(cursor.year, cursor.month, 1) if monthly else cursor.date()
        buckets[key] = (Decimal("0"), Decimal("0"))
        cursor = _add_months(cursor, 1) if monthly else cursor + timedelta(days=1)

    for tx in transactions:
        if tx.status != TransactionStatus.POSTED:
            continue
        if not (start <= tx.transaction_date < end):
            continue
        key = (
            date(tx.transaction_date.year, tx.transaction_date.month, 1)
            if monthly
            else tx.transaction_date.date()
        )
        if key not in buckets:
            continue
        income, expenses = buckets[key]
        if _is_inflow(tx):
            income += tx.amount
        elif _is_outflow(tx):
            expenses += tx.amount
        buckets[key] = (income, expenses)

    points: list[CashFlowPoint] = []
    for key in sorted(buckets):
        income, expenses = buckets[key]
        income_f = _as_float(income)
        expenses_f = _as_float(expenses)
        stamp = datetime(key.year, key.month, key.day, tzinfo=timezone.utc)
        points.append(
            CashFlowPoint(
                date=_iso(stamp),
                label=key.strftime("%b") if monthly else _day_label(key),
                income=income_f,
                expenses=expenses_f,
                net=round(income_f - expenses_f, 2),
            )
        )
    return points


def _health_status(score: float) -> str:
    if score >= 85:
        return "excellent"
    if score >= 70:
        return "strong"
    if score >= 55:
        return "good"
    return "needs_attention"


async def build_dashboard(
    db: AsyncSession,
    user: User,
    range_key: CashFlowRange = "6M",
) -> DashboardPayload:
    del range_key  # All ranges are computed so the client can switch without gaps.
    now = _now()
    generated_at = now
    errors: dict[str, SectionError] = {}

    accounts_result = await db.execute(
        select(Account).where(Account.user_id == user.id, Account.is_active.is_(True))
    )
    accounts = list(accounts_result.scalars().all())

    if not accounts:
        posted_exists = await db.execute(
            select(Transaction.id)
            .where(
                Transaction.user_id == user.id,
                Transaction.status == TransactionStatus.POSTED,
            )
            .limit(1)
        )
        if posted_exists.scalar_one_or_none() is None:
            payload = empty_dashboard(generated_at=generated_at)
            payload.goals = await _goal_cards(db, user)
            payload.notifications = []
            return payload

    lookback = now - timedelta(days=400)
    tx_result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= lookback,
            Transaction.status.in_(
                (TransactionStatus.POSTED, TransactionStatus.PENDING)
            ),
        )
        .order_by(Transaction.transaction_date.desc())
    )
    transactions = list(tx_result.scalars().all())

    posted = [tx for tx in transactions if tx.status == TransactionStatus.POSTED]
    has_ledger = bool(accounts) or bool(posted)

    if not has_ledger:
        payload = empty_dashboard(generated_at=generated_at)
        payload.goals = await _goal_cards(db, user)
        payload.notifications = []
        return payload

    this_start = _month_start(now)
    next_start = _add_months(this_start, 1)
    prev_start = _add_months(this_start, -1)

    this_income, this_expenses = _sum_flow(posted, this_start, next_start)
    prev_income, prev_expenses = _sum_flow(posted, prev_start, this_start)
    this_net = money(this_income - this_expenses)
    prev_net = money(prev_income - prev_expenses)

    assets = money(
        sum(
            (acc.balance for acc in accounts if acc.account_type not in LIABILITY_TYPES),
            Decimal("0"),
        )
    )
    liabilities = money(
        sum(
            (acc.balance for acc in accounts if acc.account_type in LIABILITY_TYPES),
            Decimal("0"),
        )
    )
    net_worth = money(assets - liabilities)
    previous_net_worth = money(net_worth - this_net)

    this_rate = (
        money(this_net / this_income * 100) if this_income > 0 else Decimal("0")
    )
    prev_rate = (
        money(prev_net / prev_income * 100) if prev_income > 0 else Decimal("0")
    )

    overview = Overview(
        netWorth=Metric(
            value=_as_float(net_worth),
            delta=Delta(
                pct=_pct_change(net_worth, previous_net_worth),
                label="vs last month",
            ),
        ),
        cashFlow=Metric(
            value=_as_float(this_net),
            delta=Delta(pct=_pct_change(this_net, prev_net), label="vs last month"),
        ),
        savingsRate=Metric(
            value=_as_float(this_rate),
            delta=Delta(
                pct=_pct_change(this_rate, prev_rate),
                label="vs last month",
            ),
        ),
        spending=Metric(
            value=_as_float(this_expenses),
            delta=Delta(
                pct=_pct_change(this_expenses, prev_expenses),
                label="vs last month",
            ),
        ),
    )

    cash_flow = {
        "7D": _series(posted, start=now - timedelta(days=6), end=now + timedelta(days=1), monthly=False),
        "30D": _series(posted, start=now - timedelta(days=29), end=now + timedelta(days=1), monthly=False),
        "3M": _series(posted, start=_add_months(this_start, -2), end=next_start, monthly=True),
        "6M": _series(posted, start=_add_months(this_start, -5), end=next_start, monthly=True),
        "1Y": _series(posted, start=_add_months(this_start, -11), end=next_start, monthly=True),
    }

    spending = _spending_breakdown(posted, this_start, next_start)
    budget = await _budget_status(db, user, posted, this_start, next_start)
    goals = await _goal_cards(db, user)
    upcoming = _upcoming(transactions, now)
    recent = _recent(posted)
    investments = _investments(accounts, posted, now)
    debt = _debt(accounts, posted, this_start, next_start)
    health = _financial_health(
        this_net=this_net,
        this_rate=this_rate,
        this_expenses=this_expenses,
        assets=assets,
        liabilities=liabilities,
        investments=investments,
        goals=goals,
    )
    insights = _insights(
        this_income=this_income,
        this_expenses=this_expenses,
        prev_expenses=prev_expenses,
        this_rate=this_rate,
        prev_rate=prev_rate,
        this_net=this_net,
        spending=spending,
        goals=goals,
        this_start=this_start,
        next_start=next_start,
        posted=posted,
    )
    recommendations = _recommendations(
        goals=goals,
        this_net=this_net,
        spending=spending,
        this_expenses=this_expenses,
        prev_expenses=prev_expenses,
        investments=investments,
    )
    notifications = _notifications(budget, upcoming, goals, now)

    return DashboardPayload(
        hasLedger=True,
        source="live",
        generatedAt=_iso(generated_at),
        overview=overview,
        financialHealth=health,
        cashFlow=cash_flow,
        spending=spending,
        budget=budget,
        insights=insights,
        goals=goals,
        upcoming=upcoming,
        recentTransactions=recent,
        investments=investments,
        debt=debt,
        recommendations=recommendations,
        notifications=notifications,
        errors=errors,
    )


async def _goal_cards(db: AsyncSession, user: User) -> list[GoalCard]:
    result = await db.execute(
        select(FinancialGoal)
        .where(
            FinancialGoal.user_id == user.id,
            FinancialGoal.status == GoalStatus.ACTIVE,
        )
        .order_by(
            FinancialGoal.is_priority.desc(),
            FinancialGoal.target_date.asc(),
        )
        .limit(6)
    )
    cards: list[GoalCard] = []
    for goal in result.scalars():
        cards.append(
            GoalCard(
                id=str(goal.id),
                name=goal.name,
                current=_as_float(goal.current_amount),
                target=_as_float(goal.target_amount),
                targetDate=goal.target_date.isoformat(),
            )
        )
    return cards


def _spending_breakdown(
    posted: list[Transaction],
    start: datetime,
    end: datetime,
) -> list[SpendingCategory]:
    totals: dict[tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0"))
    for tx in posted:
        if tx.transaction_type not in (TransactionType.EXPENSE, TransactionType.FEE):
            continue
        if not (start <= tx.transaction_date < end):
            continue
        if tx.category is None:
            key = ("other", "Other")
        else:
            key = (str(tx.category.id), tx.category.name)
        totals[key] += tx.amount

    rows = [
        SpendingCategory(id=item_id, name=name, amount=_as_float(amount))
        for (item_id, name), amount in totals.items()
    ]
    rows.sort(key=lambda row: row.amount, reverse=True)
    return rows[:8]


async def _budget_status(
    db: AsyncSession,
    user: User,
    posted: list[Transaction],
    start: datetime,
    end: datetime,
) -> BudgetStatus | None:
    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.user_id == user.id)
    )
    budgets = list(result.scalars().all())
    if not budgets:
        return None

    spent_by_category: dict[UUID, Decimal] = defaultdict(lambda: Decimal("0"))
    for tx in posted:
        if tx.category_id is None:
            continue
        if tx.transaction_type not in (TransactionType.EXPENSE, TransactionType.FEE):
            continue
        if start <= tx.transaction_date < end:
            spent_by_category[tx.category_id] += tx.amount

    categories: list[BudgetCategory] = []
    total_spent = Decimal("0")
    total_limit = Decimal("0")
    warning: str | None = None
    for budget in budgets:
        spent = money(spent_by_category.get(budget.category_id, Decimal("0")))
        limit = money(budget.monthly_limit)
        total_spent += spent
        total_limit += limit
        name = budget.category.name if budget.category else "Category"
        categories.append(
            BudgetCategory(
                id=str(budget.category_id),
                name=name,
                spent=_as_float(spent),
                limit=_as_float(limit),
            )
        )
        if limit > 0 and spent > limit and warning is None:
            over = (spent - limit) / limit * 100
            warning = f"{name} is {over.quantize(INR)}% above your monthly budget."

    if total_limit <= 0:
        return None

    return BudgetStatus(
        spent=_as_float(total_spent),
        limit=_as_float(total_limit),
        categories=categories,
        warning=warning,
    )


def _upcoming(transactions: list[Transaction], now: datetime) -> list[UpcomingItem]:
    items: list[UpcomingItem] = []
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for tx in transactions:
        if tx.status != TransactionStatus.PENDING:
            continue
        if tx.transaction_date < today:
            continue
        items.append(
            UpcomingItem(
                id=str(tx.id),
                date=tx.transaction_date.date().isoformat(),
                name=tx.merchant_name or tx.description or "Upcoming",
                amount=_as_float(tx.amount),
            )
        )
    items.sort(key=lambda item: item.date)
    return items[:8]


def _recent(posted: list[Transaction]) -> list[RecentTransaction]:
    rows: list[RecentTransaction] = []
    for tx in posted[:8]:
        rows.append(
            RecentTransaction(
                id=str(tx.id),
                date=tx.transaction_date.date().isoformat(),
                description=tx.merchant_name or tx.description or tx.transaction_type.value.title(),
                category=tx.category.name if tx.category else "Uncategorized",
                amount=_as_float(signed_amount(tx.transaction_type, tx.amount)),
            )
        )
    return rows


def _investments(
    accounts: list[Account],
    posted: list[Transaction],
    now: datetime,
) -> Investments:
    holdings = [
        acc for acc in accounts if acc.account_type == AccountType.INVESTMENT
    ]
    if not holdings:
        return _empty_investments()

    value = money(sum((acc.balance for acc in holdings), Decimal("0")))
    year_ago = now - timedelta(days=365)
    holding_ids = {acc.id for acc in holdings}
    gain = Decimal("0")
    for tx in posted:
        if tx.account_id not in holding_ids:
            continue
        if tx.transaction_date < year_ago:
            continue
        if tx.transaction_type in (TransactionType.DIVIDEND, TransactionType.INTEREST):
            gain += tx.amount
    gain = money(gain)
    basis = value - gain
    gain_pct = float((gain / basis * 100).quantize(INR)) if basis > 0 else 0.0
    return Investments(
        connected=True,
        value=_as_float(value),
        gain=_as_float(gain),
        gainPct=gain_pct,
        slices=[
            InvestmentSlice(
                id=str(acc.id),
                name=acc.name,
                value=_as_float(acc.balance),
            )
            for acc in holdings
        ],
    )


def _debt(
    accounts: list[Account],
    posted: list[Transaction],
    start: datetime,
    end: datetime,
) -> Debt:
    items = [acc for acc in accounts if acc.account_type in LIABILITY_TYPES]
    outstanding = money(sum((acc.balance for acc in items), Decimal("0")))
    payments = Decimal("0")
    for tx in posted:
        if tx.transaction_type != TransactionType.LOAN_PAYMENT:
            continue
        if start <= tx.transaction_date < end:
            payments += tx.amount
    return Debt(
        hasDebt=bool(items) and outstanding > 0,
        outstanding=_as_float(outstanding),
        monthlyPayments=_as_float(payments),
        items=[
            DebtItem(
                id=str(acc.id),
                name=acc.name,
                outstanding=_as_float(acc.balance),
            )
            for acc in items
            if acc.balance > 0
        ],
    )


def _financial_health(
    *,
    this_net: Decimal,
    this_rate: Decimal,
    this_expenses: Decimal,
    assets: Decimal,
    liabilities: Decimal,
    investments: Investments,
    goals: list[GoalCard],
) -> FinancialHealth:
    cash_flow_status = (
        "excellent" if this_net > 0 else "good" if this_net == 0 else "needs_attention"
    )
    if this_rate >= 30:
        savings_status = "excellent"
    elif this_rate >= 20:
        savings_status = "strong"
    elif this_rate >= 10:
        savings_status = "good"
    else:
        savings_status = "needs_attention"

    if liabilities <= 0:
        debt_status = "excellent"
    elif assets <= 0:
        debt_status = "needs_attention"
    else:
        ratio = float(liabilities / assets)
        if ratio < 0.2:
            debt_status = "excellent"
        elif ratio < 0.35:
            debt_status = "strong"
        elif ratio < 0.55:
            debt_status = "good"
        else:
            debt_status = "needs_attention"

    if not investments.connected:
        invest_status = "needs_attention"
    elif investments.value <= 0:
        invest_status = "good"
    elif investments.gainPct >= 6:
        invest_status = "excellent"
    elif investments.gainPct >= 0:
        invest_status = "strong"
    else:
        invest_status = "needs_attention"

    emergency = next(
        (goal for goal in goals if "emergency" in goal.name.lower()),
        None,
    )
    monthly_expenses = this_expenses if this_expenses > 0 else Decimal("1")
    if emergency:
        months = Decimal(str(emergency.current)) / monthly_expenses
        if months >= 6:
            emergency_status = "excellent"
        elif months >= 3:
            emergency_status = "strong"
        elif months >= 1:
            emergency_status = "good"
        else:
            emergency_status = "needs_attention"
    else:
        emergency_status = "needs_attention"

    rank = {
        "excellent": 95,
        "strong": 80,
        "good": 62,
        "needs_attention": 38,
    }
    pillars = [
        HealthPillar(id="cash-flow", label="Cash Flow", status=cash_flow_status),
        HealthPillar(id="savings", label="Savings", status=savings_status),
        HealthPillar(id="debt", label="Debt", status=debt_status),
        HealthPillar(id="investments", label="Investments", status=invest_status),
        HealthPillar(id="emergency", label="Emergency Fund", status=emergency_status),
    ]
    score = round(sum(rank[p.status] for p in pillars) / len(pillars))
    label = _health_status(score).replace("_", " ").title()
    if score >= 80:
        summary = "Your financial position improved compared with last month."
    elif score >= 60:
        summary = "The picture is stable. A few levers would make it stronger."
    else:
        summary = "Cash, debt, or reserves need attention before the picture is healthy."

    return FinancialHealth(
        score=score,
        max=100,
        label=label,
        summary=summary,
        pillars=pillars,
    )


def _insights(
    *,
    this_income: Decimal,
    this_expenses: Decimal,
    prev_expenses: Decimal,
    this_rate: Decimal,
    prev_rate: Decimal,
    this_net: Decimal,
    spending: list[SpendingCategory],
    goals: list[GoalCard],
    this_start: datetime,
    next_start: datetime,
    posted: list[Transaction],
) -> list[Insight]:
    del this_start, next_start, posted, this_income
    items: list[Insight] = []

    if prev_expenses > 0 and this_expenses > prev_expenses * Decimal("1.1"):
        lift = _pct_change(this_expenses, prev_expenses)
        top = spending[0].name if spending else "discretionary spend"
        items.append(
            Insight(
                id="spend-up",
                title=f"Spending is {lift:.0f}% higher than last month.",
                body=f"{top} is the largest category this month. Cutting it back would restore last month's pace.",
                actionLabel="View Analysis",
                actionHref="/transactions",
                prompt="Why did my spending increase this month, and where should I cut?",
            )
        )

    if this_rate > prev_rate and this_rate > 0:
        items.append(
            Insight(
                id="savings-up",
                title=f"Your savings rate moved from {float(prev_rate):.0f}% → {float(this_rate):.0f}%.",
                body="You are currently ahead of last month's savings pace.",
                actionLabel="View Details",
                actionHref="/reports",
                prompt="What changed in my savings rate this month?",
            )
        )

    emergency = next((goal for goal in goals if "emergency" in goal.name.lower()), None)
    if emergency and this_expenses > 0:
        months = emergency.current / float(this_expenses)
        items.append(
            Insight(
                id="emergency",
                title=f"Your emergency fund covers {months:.1f} months of current expenses.",
                body="Recommended target: 6 months.",
                actionLabel="Build Emergency Fund",
                actionHref="/goals",
                prompt="Build a plan to grow my emergency fund to 6 months of expenses.",
            )
        )

    if this_net > 0:
        items.append(
            Insight(
                id="surplus",
                title=f"Estimated surplus of ₹{int(this_net):,} is available this month.",
                body="Deploying part of it into goals or investments keeps timelines honest without changing lifestyle spend.",
                actionLabel="Optimize Investments",
                actionHref="/investments",
                prompt=f"Where should I deploy ₹{int(this_net)} of monthly surplus?",
            )
        )

    return items[:4]


def _recommendations(
    *,
    goals: list[GoalCard],
    this_net: Decimal,
    spending: list[SpendingCategory],
    this_expenses: Decimal,
    prev_expenses: Decimal,
    investments: Investments,
) -> list[Recommendation]:
    recs: list[Recommendation] = []
    emergency = next((goal for goal in goals if "emergency" in goal.name.lower()), None)
    if emergency and emergency.current < emergency.target:
        recs.append(
            Recommendation(
                id="r-emergency",
                index="01",
                title="Build your emergency fund",
                body="A funded reserve is the first move before extra investing or discretionary spend.",
                actionLabel="View Plan",
                actionHref="/goals",
                prompt="Give me a plan to finish my emergency fund.",
            )
        )

    if prev_expenses > 0 and this_expenses > prev_expenses:
        top = spending[0].name if spending else "Discretionary categories"
        recs.append(
            Recommendation(
                id="r-spend",
                index=f"{len(recs)+1:02d}",
                title="Reduce discretionary spending",
                body=f"{top} led this month's increase.",
                actionLabel="Analyze Spending",
                actionHref="/transactions",
                prompt="Analyze my spending increase this month.",
            )
        )

    if this_net > 0:
        recs.append(
            Recommendation(
                id="r-invest",
                index=f"{len(recs)+1:02d}",
                title="Increase your monthly investment"
                if investments.connected
                else "Start investing the surplus",
                body=f"You have ₹{int(this_net):,} of estimated monthly surplus available.",
                actionLabel="Optimize Investments",
                actionHref="/investments",
                prompt=f"How should I invest ₹{int(this_net)} of monthly surplus?",
            )
        )

    return recs[:3]


def _notifications(
    budget: BudgetStatus | None,
    upcoming: list[UpcomingItem],
    goals: list[GoalCard],
    now: datetime,
) -> list[NotificationItem]:
    notes: list[NotificationItem] = []
    if budget and budget.warning:
        notes.append(
            NotificationItem(
                id="n-budget",
                title="Budget",
                body=budget.warning,
                at=_iso(now),
            )
        )
    soon = now.date() + timedelta(days=2)
    for item in upcoming:
        due = date.fromisoformat(item.date)
        if due <= soon:
            notes.append(
                NotificationItem(
                    id=f"n-up-{item.id}",
                    title="Upcoming",
                    body=f"{item.name} is scheduled for {due.strftime('%d %b')}.",
                    at=_iso(now),
                )
            )
            break
    emergency = next((goal for goal in goals if "emergency" in goal.name.lower()), None)
    if emergency and emergency.target > 0:
        pct = emergency.current / emergency.target
        if pct >= 0.5:
            notes.append(
                NotificationItem(
                    id="n-goal",
                    title="Emergency fund",
                    body=f"Your emergency fund is at {pct:.0%} of target.",
                    at=_iso(now),
                )
            )
    return notes[:5]
