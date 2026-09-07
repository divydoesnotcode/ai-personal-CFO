export type CashFlowRange = "7D" | "30D" | "3M" | "6M" | "1Y";

export type HealthStatus = "excellent" | "strong" | "good" | "needs_attention";

export type Delta = {
  pct: number;
  label: string;
};

export type Metric = {
  value: number;
  delta: Delta;
};

export type Overview = {
  netWorth: Metric;
  cashFlow: Metric;
  savingsRate: Metric;
  spending: Metric;
};

export type HealthPillar = {
  id: string;
  label: string;
  status: HealthStatus;
};

export type FinancialHealth = {
  score: number;
  max: number;
  label: string;
  summary: string;
  pillars: HealthPillar[];
};

export type CashFlowPoint = {
  date: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
};

export type SpendingCategory = {
  id: string;
  name: string;
  amount: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  limit: number;
};

export type BudgetStatus = {
  spent: number;
  limit: number;
  categories: BudgetCategory[];
  warning: string | null;
};

export type Insight = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  prompt?: string;
};

export type Goal = {
  id: string;
  name: string;
  current: number;
  target: number;
  targetDate: string;
};

export type UpcomingItem = {
  id: string;
  date: string;
  name: string;
  amount: number;
};

export type RecentTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
};

export type InvestmentSlice = {
  id: string;
  name: string;
  value: number;
};

export type Investments = {
  connected: boolean;
  value: number;
  gain: number;
  gainPct: number;
  slices: InvestmentSlice[];
};

export type DebtItem = {
  id: string;
  name: string;
  outstanding: number;
};

export type Debt = {
  hasDebt: boolean;
  outstanding: number;
  monthlyPayments: number;
  items: DebtItem[];
};

export type Recommendation = {
  id: string;
  index: string;
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  prompt?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  at: string;
};

export type SectionError = {
  message: string;
};

export type DashboardPayload = {
  hasLedger: boolean;
  source: "live" | "preview";
  generatedAt: string;
  overview: Overview | null;
  financialHealth: FinancialHealth | null;
  cashFlow: Record<CashFlowRange, CashFlowPoint[]>;
  spending: SpendingCategory[];
  budget: BudgetStatus | null;
  insights: Insight[];
  goals: Goal[];
  upcoming: UpcomingItem[];
  recentTransactions: RecentTransaction[];
  investments: Investments;
  debt: Debt;
  recommendations: Recommendation[];
  notifications: NotificationItem[];
  errors: Partial<
    Record<
      | "overview"
      | "financialHealth"
      | "cashFlow"
      | "spending"
      | "budget"
      | "insights"
      | "goals"
      | "upcoming"
      | "recentTransactions"
      | "investments"
      | "debt"
      | "recommendations",
      SectionError
    >
  >;
};

export const CASH_FLOW_RANGES: CashFlowRange[] = ["7D", "30D", "3M", "6M", "1Y"];
