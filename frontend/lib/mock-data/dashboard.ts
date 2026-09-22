import type {
  CashFlowPoint,
  CashFlowRange,
  DashboardPayload,
} from "@/lib/dashboard/types";

function isoDaysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 12, 0, 0);
  return date.toISOString();
}

function monthPoint(monthsAgo: number, income: number, expenses: number): CashFlowPoint {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  const label = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date);
  return {
    date: date.toISOString(),
    label,
    income,
    expenses,
    net: income - expenses,
  };
}

function dayPoint(daysAgo: number, income: number, expenses: number): CashFlowPoint {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const label = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
  return {
    date: date.toISOString(),
    label,
    income,
    expenses,
    net: income - expenses,
  };
}

const cashFlow: Record<CashFlowRange, CashFlowPoint[]> = {
  "7D": [
    dayPoint(6, 0, 1840),
    dayPoint(5, 0, 920),
    dayPoint(4, 8500, 3240),
    dayPoint(3, 0, 1460),
    dayPoint(2, 0, 2100),
    dayPoint(1, 0, 780),
    dayPoint(0, 0, 640),
  ],
  "30D": Array.from({ length: 10 }, (_, index) => {
    const ago = 27 - index * 3;
    const income = index === 2 ? 68_000 : index === 7 ? 8_500 : 0;
    const expenses = [4100, 3600, 5200, 2800, 6100, 2400, 3900, 3300, 4700, 2100][index];
    return dayPoint(ago, income, expenses);
  }),
  "3M": [
    monthPoint(2, 64_200, 44_800),
    monthPoint(1, 66_100, 45_500),
    monthPoint(0, 68_000, 41_820),
  ],
  "6M": [
    monthPoint(5, 61_400, 43_200),
    monthPoint(4, 62_800, 44_100),
    monthPoint(3, 63_500, 46_800),
    monthPoint(2, 64_200, 44_800),
    monthPoint(1, 66_100, 45_500),
    monthPoint(0, 68_000, 41_820),
  ],
  "1Y": [
    monthPoint(11, 54_000, 41_200),
    monthPoint(10, 55_400, 42_000),
    monthPoint(9, 56_800, 43_400),
    monthPoint(8, 58_200, 42_800),
    monthPoint(7, 59_100, 44_600),
    monthPoint(6, 60_400, 43_900),
    monthPoint(5, 61_400, 43_200),
    monthPoint(4, 62_800, 44_100),
    monthPoint(3, 63_500, 46_800),
    monthPoint(2, 64_200, 44_800),
    monthPoint(1, 66_100, 45_500),
    monthPoint(0, 68_000, 41_820),
  ],
};

export const DASHBOARD_FIXTURE: DashboardPayload = {
  hasLedger: true,
  source: "preview",
  generatedAt: isoDaysAgo(0, 11),
  overview: {
    netWorth: { value: 482_500, delta: { pct: 6.2, label: "vs last month" } },
    cashFlow: { value: 32_450, delta: { pct: 12.4, label: "vs last month" } },
    savingsRate: { value: 38.5, delta: { pct: 4.2, label: "vs last month" } },
    spending: { value: 41_820, delta: { pct: -8.1, label: "vs last month" } },
  },
  financialHealth: {
    score: 82,
    max: 100,
    label: "Excellent",
    summary: "Your financial position improved compared with last month.",
    pillars: [
      { id: "cash-flow", label: "Cash Flow", status: "excellent" },
      { id: "savings", label: "Savings", status: "strong" },
      { id: "debt", label: "Debt", status: "excellent" },
      { id: "investments", label: "Investments", status: "good" },
      { id: "emergency", label: "Emergency Fund", status: "needs_attention" },
    ],
  },
  cashFlow,
  spending: [
    { id: "housing", name: "Housing", amount: 18_000 },
    { id: "food", name: "Food", amount: 7_420 },
    { id: "transport", name: "Transportation", amount: 4_200 },
    { id: "entertainment", name: "Entertainment", amount: 2_800 },
    { id: "shopping", name: "Shopping", amount: 5_400 },
    { id: "other", name: "Other", amount: 4_000 },
  ],
  budget: {
    spent: 48_000,
    limit: 60_000,
    warning: "Shopping is 14% above your monthly budget.",
    categories: [
      { id: "food", name: "Food", spent: 7_420, limit: 10_000 },
      { id: "transport", name: "Transportation", spent: 4_200, limit: 6_000 },
      { id: "entertainment", name: "Entertainment", spent: 2_800, limit: 4_000 },
      { id: "shopping", name: "Shopping", spent: 5_400, limit: 8_000 },
    ],
  },
  insights: [
    {
      id: "dining",
      title: "You spent 23% more on dining this month.",
      body: "Reducing dining expenses by ₹1,500/month could increase your annual savings by ₹18,000.",
      actionLabel: "View Analysis",
      prompt: "Why did dining spend increase this month, and how do I cut ₹1,500?",
    },
    {
      id: "savings",
      title: "Your savings rate increased from 31% → 38%.",
      body: "You're currently ahead of your monthly savings target.",
      actionLabel: "View Details",
      actionHref: "/reports",
      prompt: "What changed in my savings rate this month?",
    },
    {
      id: "emergency",
      title: "Your emergency fund covers 2.4 months of current expenses.",
      body: "Recommended target: 6 months.",
      actionLabel: "Build Emergency Fund",
      actionHref: "/goals",
      prompt: "Build a plan to grow my emergency fund to 6 months of expenses.",
    },
    {
      id: "surplus",
      title: "Estimated surplus of ₹4,800 is sitting in cash this month.",
      body: "Deploying it into your SIP would keep goal timelines on track without changing lifestyle spend.",
      actionLabel: "Optimize Investments",
      actionHref: "/investments",
      prompt: "Where should I deploy ₹4,800 of monthly surplus?",
    },
  ],
  goals: [
    {
      id: "mba",
      name: "MBA Fund",
      current: 320_000,
      target: 800_000,
      targetDate: "2028-06-01",
    },
    {
      id: "emergency",
      name: "Emergency Fund",
      current: 75_000,
      target: 250_000,
      targetDate: "2027-03-01",
    },
    {
      id: "laptop",
      name: "New Laptop",
      current: 40_000,
      target: 120_000,
      targetDate: "2026-12-01",
    },
  ],
  upcoming: [
    { id: "rent", date: "2026-09-01", name: "Rent", amount: 18_000 },
    { id: "sip", date: "2026-09-03", name: "SIP", amount: 5_000 },
    { id: "internet", date: "2026-09-05", name: "Internet", amount: 999 },
    { id: "cc", date: "2026-09-07", name: "Credit Card", amount: 12_400 },
  ],
  recentTransactions: [
    {
      id: "t1",
      date: "2026-08-30",
      description: "Swiggy",
      category: "Food",
      amount: -420,
    },
    {
      id: "t2",
      date: "2026-08-29",
      description: "Salary",
      category: "Income",
      amount: 25_000,
    },
    {
      id: "t3",
      date: "2026-08-29",
      description: "Uber",
      category: "Transport",
      amount: -340,
    },
    {
      id: "t4",
      date: "2026-08-28",
      description: "Amazon",
      category: "Shopping",
      amount: -1_299,
    },
    {
      id: "t5",
      date: "2026-08-27",
      description: "Netflix",
      category: "Entertainment",
      amount: -649,
    },
  ],
  investments: {
    connected: true,
    value: 642_800,
    gain: 42_800,
    gainPct: 7.1,
    slices: [
      { id: "equity", name: "Equity", value: 420_000 },
      { id: "mf", name: "Mutual Funds", value: 172_800 },
      { id: "other", name: "Other", value: 50_000 },
    ],
  },
  debt: {
    hasDebt: true,
    outstanding: 284_000,
    monthlyPayments: 18_400,
    items: [
      { id: "cc", name: "Credit Card", outstanding: 42_000 },
      { id: "pl", name: "Personal Loan", outstanding: 180_000 },
      { id: "edu", name: "Education Loan", outstanding: 62_000 },
    ],
  },
  recommendations: [
    {
      id: "r1",
      index: "01",
      title: "Build your emergency fund",
      body: "You're currently 3.6 months away from your recommended safety target.",
      actionLabel: "View Plan",
      actionHref: "/goals",
      prompt: "Give me a plan to finish my emergency fund.",
    },
    {
      id: "r2",
      index: "02",
      title: "Reduce discretionary spending",
      body: "Dining and shopping increased 18% this month.",
      actionLabel: "Analyze Spending",
      actionHref: "/transactions",
      prompt: "Analyze my dining and shopping increase this month.",
    },
    {
      id: "r3",
      index: "03",
      title: "Increase your monthly investment",
      body: "You have ₹4,800 of estimated monthly surplus available.",
      actionLabel: "Optimize Investments",
      actionHref: "/investments",
      prompt: "How should I invest ₹4,800 of monthly surplus?",
    },
  ],
  notifications: [
    {
      id: "n1",
      title: "Budget",
      body: "Your spending exceeded your monthly budget by 8%.",
      at: isoDaysAgo(0, 9),
    },
    {
      id: "n2",
      title: "SIP",
      body: "Your SIP is scheduled for tomorrow.",
      at: isoDaysAgo(0, 8),
    },
    {
      id: "n3",
      title: "Emergency fund",
      body: "Your emergency fund reached 3 months of expenses.",
      at: isoDaysAgo(2, 12),
    },
  ],
  errors: {},
};

export function emptyDashboard(): DashboardPayload {
  return {
    hasLedger: false,
    source: "live",
    generatedAt: new Date().toISOString(),
    overview: null,
    financialHealth: null,
    cashFlow: { "7D": [], "30D": [], "3M": [], "6M": [], "1Y": [] },
    spending: [],
    budget: null,
    insights: [],
    goals: [],
    upcoming: [],
    recentTransactions: [],
    investments: { connected: false, value: 0, gain: 0, gainPct: 0, slices: [] },
    debt: { hasDebt: false, outstanding: 0, monthlyPayments: 0, items: [] },
    recommendations: [],
    notifications: [],
    errors: {},
  };
}
