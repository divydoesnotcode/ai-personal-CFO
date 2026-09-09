"""Pydantic schemas for the dashboard payload."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


CashFlowRange = Literal["7D", "30D", "3M", "6M", "1Y"]
HealthStatus = Literal["excellent", "strong", "good", "needs_attention"]
DashboardSource = Literal["live", "preview"]


class Delta(BaseModel):
    pct: float
    label: str


class Metric(BaseModel):
    value: float
    delta: Delta


class Overview(BaseModel):
    netWorth: Metric
    cashFlow: Metric
    savingsRate: Metric
    spending: Metric


class HealthPillar(BaseModel):
    id: str
    label: str
    status: HealthStatus


class FinancialHealth(BaseModel):
    score: int
    max: int = 100
    label: str
    summary: str
    pillars: list[HealthPillar]


class CashFlowPoint(BaseModel):
    date: str
    label: str
    income: float
    expenses: float
    net: float


class SpendingCategory(BaseModel):
    id: str
    name: str
    amount: float


class BudgetCategory(BaseModel):
    id: str
    name: str
    spent: float
    limit: float


class BudgetStatus(BaseModel):
    spent: float
    limit: float
    categories: list[BudgetCategory]
    warning: str | None = None


class Insight(BaseModel):
    id: str
    title: str
    body: str
    actionLabel: str
    actionHref: str | None = None
    prompt: str | None = None


class GoalCard(BaseModel):
    id: str
    name: str
    current: float
    target: float
    targetDate: str


class UpcomingItem(BaseModel):
    id: str
    date: str
    name: str
    amount: float


class RecentTransaction(BaseModel):
    id: str
    date: str
    description: str
    category: str
    amount: float


class InvestmentSlice(BaseModel):
    id: str
    name: str
    value: float


class Investments(BaseModel):
    connected: bool
    value: float
    gain: float
    gainPct: float
    slices: list[InvestmentSlice]


class DebtItem(BaseModel):
    id: str
    name: str
    outstanding: float


class Debt(BaseModel):
    hasDebt: bool
    outstanding: float
    monthlyPayments: float
    items: list[DebtItem]


class Recommendation(BaseModel):
    id: str
    index: str
    title: str
    body: str
    actionLabel: str
    actionHref: str | None = None
    prompt: str | None = None


class NotificationItem(BaseModel):
    id: str
    title: str
    body: str
    at: str


class SectionError(BaseModel):
    message: str


class DashboardPayload(BaseModel):
    hasLedger: bool
    source: DashboardSource = "live"
    generatedAt: str
    overview: Overview | None = None
    financialHealth: FinancialHealth | None = None
    cashFlow: dict[str, list[CashFlowPoint]]
    spending: list[SpendingCategory] = Field(default_factory=list)
    budget: BudgetStatus | None = None
    insights: list[Insight] = Field(default_factory=list)
    goals: list[GoalCard] = Field(default_factory=list)
    upcoming: list[UpcomingItem] = Field(default_factory=list)
    recentTransactions: list[RecentTransaction] = Field(default_factory=list)
    investments: Investments
    debt: Debt
    recommendations: list[Recommendation] = Field(default_factory=list)
    notifications: list[NotificationItem] = Field(default_factory=list)
    errors: dict[str, SectionError] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    success: bool = True
    message: str
    data: DashboardPayload
