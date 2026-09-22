"use client";

import { memo } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAskCfo } from "@/lib/dashboard/ask-cfo";
import type {
  BudgetStatus,
  CashFlowPoint,
  CashFlowRange,
  Debt,
  FinancialHealth,
  Goal,
  Insight,
  Investments,
  Metric,
  Overview,
  Recommendation,
  RecentTransaction,
  SpendingCategory,
  UpcomingItem,
} from "@/lib/dashboard/types";
import { CASH_FLOW_RANGES } from "@/lib/dashboard/types";
import {
  formatDate,
  formatINR,
  formatPercent,
} from "@/lib/format-money";

import {
  Delta,
  EmptyBlock,
  ErrorBlock,
  Panel,
  Progress,
  QuietLink,
  Skeleton,
  statusLabel,
} from "./ui";

const INK = "#efeae1";
const ACCENT = "#c45c26";
const SUCCESS = "#5fa67a";
const DANGER = "#d26a5a";
const FAINT = "#5c5850";
const GRID = "rgba(239, 234, 225, 0.08)";

export const OverviewCards = memo(function OverviewCards({
  overview,
  loading,
  error,
  onRetry,
}: {
  overview: Overview | null;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <Panel title="Overview">
        <ErrorBlock message={error} onRetry={onRetry} />
      </Panel>
    );
  }

  const cards: {
    key: keyof Overview;
    label: string;
    format: (metric: Metric) => string;
    invert?: boolean;
  }[] = [
    {
      key: "netWorth",
      label: "Net Worth",
      format: (metric) => formatINR(metric.value),
    },
    {
      key: "cashFlow",
      label: "Cash Flow",
      format: (metric) => formatINR(metric.value, true),
    },
    {
      key: "savingsRate",
      label: "Savings Rate",
      format: (metric) => formatPercent(metric.value),
    },
    {
      key: "spending",
      label: "Spending",
      format: (metric) => formatINR(metric.value),
      invert: true,
    },
  ];

  return (
    <div className="dash-overview">
      {cards.map((card) => {
        const metric = overview?.[card.key];
        return (
          <article key={card.key} className="cfo-card dash-metric">
            <p className="dash-metric-label">{card.label}</p>
            {loading || !metric ? (
              <Skeleton value lines={2} />
            ) : (
              <>
                <p className="dash-metric-value">{card.format(metric)}</p>
                <Delta
                  pct={metric.delta.pct}
                  label={metric.delta.label}
                  invert={card.invert}
                />
              </>
            )}
          </article>
        );
      })}
    </div>
  );
});

export function HealthPanel({
  health,
  loading,
  error,
  onRetry,
}: {
  health: FinancialHealth | null;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Financial Health" className="dash-order-health" accent>
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading || !health ? (
        <Skeleton lines={6} />
      ) : (
        <>
          <div className="dash-score">
            <strong>{health.score}</strong>
            <span>/ {health.max}</span>
          </div>
          <p className="dash-score-label">{health.label}</p>
          <Progress value={(health.score / health.max) * 100} />
          <p className="dash-summary">{health.summary}</p>
          <div className="dash-pillars">
            {health.pillars.map((pillar) => (
              <div key={pillar.id} className="dash-pillar">
                {pillar.label}
                <span
                  className={
                    pillar.status === "needs_attention"
                      ? "cfo-badge cfo-badge--warn"
                      : pillar.status === "excellent" || pillar.status === "strong"
                        ? "cfo-badge cfo-badge--ok"
                        : "cfo-badge"
                  }
                >
                  {statusLabel(pillar.status)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CashFlowPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="dash-tooltip">
      <strong>{point.label}</strong>
      <p>
        <span>Income</span>
        <span>{formatINR(point.income)}</span>
      </p>
      <p>
        <span>Expenses</span>
        <span>{formatINR(point.expenses)}</span>
      </p>
      <p>
        <span>Net Flow</span>
        <span>{formatINR(point.net, true)}</span>
      </p>
    </div>
  );
}

export function CashFlowPanel({
  points,
  range,
  onRange,
  loading,
  error,
  onRetry,
}: {
  points: CashFlowPoint[];
  range: CashFlowRange;
  onRange: (range: CashFlowRange) => void;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <Panel
      title="Cash Flow"
      className="dash-order-flow"
      actions={
        <div className="dash-range" role="group" aria-label="Cash flow range">
          {CASH_FLOW_RANGES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === range}
              onClick={() => onRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={8} />
      ) : points.length === 0 ? (
        <EmptyBlock
          title="Cash flow is waiting on the ledger"
          body="Import transactions to see income, expenses, and net movement."
        />
      ) : (
        <>
          <div className="dash-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: FAINT, fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={{ stroke: GRID }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: FAINT, fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("en-IN", { notation: "compact" }).format(value)
                  }
                />
                <Tooltip content={<CashFlowTooltip />} cursor={{ stroke: INK, strokeOpacity: 0.2 }} />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={SUCCESS}
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={!reduced}
                  activeDot={{ r: 3, fill: SUCCESS }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke={DANGER}
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={!reduced}
                  activeDot={{ r: 3, fill: DANGER }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke={ACCENT}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={!reduced}
                  activeDot={{ r: 3, fill: ACCENT }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-legend">
            <span>
              <i style={{ background: SUCCESS }} /> Income
            </span>
            <span>
              <i style={{ background: DANGER }} /> Expenses
            </span>
            <span>
              <i style={{ background: ACCENT }} /> Net flow
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

export function SpendingPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  items: SpendingCategory[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const max = items.reduce((sum, item) => Math.max(sum, item.amount), 0) || 1;
  return (
    <Panel title="Spending Breakdown" className="dash-order-spend">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={6} />
      ) : items.length === 0 ? (
        <EmptyBlock
          title="No spending picture yet"
          body="Once transactions are classified, category movement will appear here."
        />
      ) : (
        <div className="dash-rows">
          {items.map((item) => (
            <div key={item.id} className="dash-row">
              <div className="dash-row-top">
                {item.name}
                <span>{formatINR(item.amount)}</span>
              </div>
              <span className="dash-h-bar" aria-hidden="true">
                <i style={{ width: `${(item.amount / max) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function BudgetPanel({
  budget,
  loading,
  error,
  onRetry,
}: {
  budget: BudgetStatus | null;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const used = budget ? Math.round((budget.spent / budget.limit) * 100) : 0;
  return (
    <Panel title="Budget Status" className="dash-order-budget">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={6} />
      ) : !budget ? (
        <EmptyBlock
          title="No monthly budget set"
          body="Set category limits to see how the month is tracking."
          action="Open budgets"
          href="/budgets"
        />
      ) : (
        <>
          <p className="dash-metric-label">Monthly Budget</p>
          <div className="dash-budget-meta">
            <span>
              {formatINR(budget.spent)} / {formatINR(budget.limit)}
            </span>
            <span>{used}% used</span>
          </div>
          <Progress
            value={used}
            tone={used > 100 ? "danger" : used >= 80 ? "warn" : "accent"}
          />
          <div className="dash-rows" style={{ marginTop: "0.9rem" }}>
            {budget.categories.map((category) => {
              const pct = Math.round((category.spent / category.limit) * 100);
              return (
                <div key={category.id} className="dash-row">
                  <div className="dash-row-top">
                    {category.name}
                    <span>
                      {formatINR(category.spent)} / {formatINR(category.limit)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    tone={pct > 100 ? "danger" : pct >= 90 ? "warn" : "accent"}
                  />
                </div>
              );
            })}
          </div>
          {budget.warning ? <p className="dash-warn">⚠ {budget.warning}</p> : null}
        </>
      )}
    </Panel>
  );
}

export function InsightsPanel({
  insights,
  loading,
  error,
  onRetry,
}: {
  insights: Insight[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const { openPanel } = useAskCfo();

  if (error) {
    return (
      <Panel title="AI CFO Insights" className="dash-order-insights">
        <ErrorBlock message={error} onRetry={onRetry} />
      </Panel>
    );
  }

  if (loading) {
    return (
      <div className="dash-insights dash-order-insights">
        {Array.from({ length: 3 }, (_, index) => (
          <Panel key={index} title="AI CFO Insights">
            <Skeleton lines={4} />
          </Panel>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Panel title="AI CFO Insights" className="dash-order-insights">
        <EmptyBlock
          title="Insights will appear with your ledger"
          body="The CFO surfaces 3–5 actions once there is enough history to judge."
        />
      </Panel>
    );
  }

  return (
    <div className="dash-insights dash-order-insights">
      {insights.slice(0, 5).map((insight, index) => (
        <article key={insight.id} className="cfo-card dash-insight">
          <p className="dash-metric-label">Insight {String(index + 1).padStart(2, "0")}</p>
          <h3>{insight.title}</h3>
          <p>{insight.body}</p>
          {insight.actionHref ? (
            <Link href={insight.actionHref} className="dash-quiet">
              {insight.actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="dash-quiet"
              onClick={() => openPanel(insight.prompt)}
            >
              {insight.actionLabel}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

export function GoalsPanel({
  goals,
  loading,
  error,
  onRetry,
}: {
  goals: Goal[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel
      title="Financial Goals"
      className="dash-order-goals"
      actions={
        <QuietLink href="/goals">
          <Plus size={12} /> Add Goal
        </QuietLink>
      }
    >
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={6} />
      ) : goals.length === 0 ? (
        <EmptyBlock
          title="No active goals"
          body="Name a target and a date. The CFO will track whether you are on pace."
          action="Add a goal"
          href="/goals"
        />
      ) : (
        <div className="dash-rows">
          {goals.map((goal) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            return (
              <div key={goal.id} className="dash-row">
                <p className="dash-goal-name">{goal.name}</p>
                <div className="dash-row-top">
                  <span>
                    {formatINR(goal.current)} / {formatINR(goal.target)}
                  </span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} />
                <div className="dash-goal-meta">
                  <span>Target: {formatDate(goal.targetDate, { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function UpcomingPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  items: UpcomingItem[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Upcoming" className="dash-order-upcoming">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={5} />
      ) : items.length === 0 ? (
        <EmptyBlock
          title="No upcoming commitments"
          body="Scheduled rent, SIPs, and bills will land here."
        />
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} className="dash-upcoming-item">
              <time dateTime={item.date}>{formatDate(item.date)}</time>
              <span>{item.name}</span>
              <b>{formatINR(item.amount)}</b>
            </div>
          ))}
          <div className="dash-cta-row">
            <QuietLink href="/transactions">View all transactions →</QuietLink>
          </div>
        </>
      )}
    </Panel>
  );
}

export function TransactionsPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  items: RecentTransaction[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Recent Transactions" className="dash-order-tx">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={5} />
      ) : items.length === 0 ? (
        <EmptyBlock
          title="No transactions yet"
          body="Add or import your first movement to start the ledger."
          action="Add transaction"
          href="/transactions"
        />
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.description}</td>
                  <td>{item.category}</td>
                  <td className={item.amount >= 0 ? "dash-pos" : "dash-neg"}>
                    {formatINR(item.amount, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function InvestmentsPanel({
  investments,
  loading,
  error,
  onRetry,
}: {
  investments: Investments;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Investments" className="dash-order-invest">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={5} />
      ) : !investments.connected ? (
        <EmptyBlock
          title="No investment data yet."
          body="Connect your investment account to unlock portfolio analysis."
          action="Connect Investments"
          href="/investments"
        />
      ) : (
        <>
          <p className="dash-metric-label">Portfolio Value</p>
          <p className="dash-metric-value">{formatINR(investments.value)}</p>
          <p className={`dash-delta ${investments.gain >= 0 ? "dash-delta--up" : "dash-delta--down"}`}>
            {formatINR(investments.gain, true)} ({formatPercent(investments.gainPct, 1, true)})
          </p>
          <div className="dash-alloc">
            {investments.slices.map((slice) => (
              <div key={slice.id} className="dash-row-top">
                {slice.name}
                <span>{formatINR(slice.value)}</span>
              </div>
            ))}
          </div>
          <div className="dash-cta-row">
            <QuietLink href="/investments">View Portfolio →</QuietLink>
          </div>
        </>
      )}
    </Panel>
  );
}

export function DebtPanel({
  debt,
  loading,
  error,
  onRetry,
}: {
  debt: Debt;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Debt" className="dash-order-debt">
      {error ? (
        <ErrorBlock message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton lines={5} />
      ) : !debt.hasDebt ? (
        <EmptyBlock
          title="No outstanding debt."
          body="Your current debt position is excellent."
        />
      ) : (
        <>
          <p className="dash-metric-label">Total Outstanding</p>
          <p className="dash-metric-value">{formatINR(debt.outstanding)}</p>
          <p className="dash-delta">
            Monthly payments <b style={{ color: "var(--cfo-ink)" }}>{formatINR(debt.monthlyPayments)}</b>
          </p>
          <div className="dash-alloc">
            {debt.items.map((item) => (
              <div key={item.id} className="dash-row-top">
                {item.name}
                <span>{formatINR(item.outstanding)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

export function MovesPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  items: Recommendation[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const { openPanel } = useAskCfo();

  if (error) {
    return (
      <Panel title="Your Next Best Moves">
        <ErrorBlock message={error} onRetry={onRetry} />
      </Panel>
    );
  }

  if (loading) {
    return (
      <Panel title="Your Next Best Moves">
        <Skeleton lines={4} />
      </Panel>
    );
  }

  if (items.length === 0) {
    return (
      <Panel title="Your Next Best Moves">
        <EmptyBlock
          title="No recommended moves yet"
          body="Once the ledger has history, the CFO will rank the next three actions by impact."
        />
      </Panel>
    );
  }

  return (
    <section>
      <p className="cfo-kicker" style={{ marginBottom: "0.7rem" }}>
        Your next best moves
      </p>
      <div className="dash-moves">
        {items.slice(0, 3).map((item) => (
          <article key={item.id} className="cfo-card dash-move">
            <p className="dash-move-index">{item.index}</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            {item.actionHref ? (
              <Link href={item.actionHref} className="dash-quiet">
                {item.actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="dash-quiet"
                onClick={() => openPanel(item.prompt)}
              >
                {item.actionLabel}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
