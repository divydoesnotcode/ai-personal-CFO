"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";

import { useAskCfo } from "@/lib/dashboard/ask-cfo";
import { useDashboard } from "@/lib/dashboard/use-dashboard";
import { useAuth } from "@/lib/use-auth";
import {
  firstName,
  formatMonthYear,
  formatRelativeTime,
  greetingFor,
} from "@/lib/format-money";

import {
  BudgetPanel,
  CashFlowPanel,
  DebtPanel,
  GoalsPanel,
  HealthPanel,
  InsightsPanel,
  InvestmentsPanel,
  MovesPanel,
  OverviewCards,
  SpendingPanel,
  TransactionsPanel,
  UpcomingPanel,
} from "./sections";
import { Corners } from "./ui";

function fade(index: number, reduced: boolean | null) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, delay: index * 0.04, ease: "easeOut" as const },
  };
}

export function DashboardView() {
  const { user } = useAuth();
  const { openPanel } = useAskCfo();
  const { data, loading, error, range, setRange, retry } = useDashboard();
  const reduced = useReducedMotion();

  const name = firstName(user?.name ?? "");
  const month = formatMonthYear();

  if (error && !data) {
    return (
      <div className="dash-content-inner">
        <section className="cfo-panel dash-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>Dashboard</strong>
            <span>ERR</span>
          </div>
          <div className="dash-error">
            <p>{error}</p>
            <button type="button" className="dash-quiet" onClick={retry}>
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!loading && data && !data.hasLedger) {
    return (
      <div className="dash-content-inner">
        <section className="cfo-panel dash-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>Ledger</strong>
            <span>AWAITING</span>
          </div>
          <div className="dash-empty">
            <h2>Your financial picture is waiting.</h2>
            <p>
              Connect your accounts or add your first transaction to start
              building your CFO dashboard.
            </p>
            <div className="dash-actions">
              <Link href="/transactions" className="cfo-btn cfo-btn--ghost">
                Get Started
              </Link>
              <button
                type="button"
                className="cfo-btn cfo-btn--ghost"
                onClick={() => openPanel()}
              >
                Ask your CFO
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const errors = data?.errors ?? {};

  return (
    <div className="dash-content-inner dash-stack">
      <motion.header className="dash-greeting dash-span" {...fade(0, reduced)}>
        <div>
          <h1>
            {greetingFor()}, <em>{name}</em>
          </h1>
          <p>Here&apos;s your financial picture for {month}.</p>
          <div className="dash-actions" style={{ marginTop: "0.7rem" }}>
            <Link href="/transactions" className="dash-quiet">
              <Plus size={12} /> Add Transaction
            </Link>
            <Link href="/goals" className="dash-quiet">
              <Plus size={12} /> Add Goal
            </Link>
            <button type="button" className="dash-quiet" onClick={() => openPanel()}>
              Ask CFO
            </button>
          </div>
        </div>
        <p className="dash-updated">
          Last updated:{" "}
          {data ? formatRelativeTime(data.generatedAt) : "loading"}
          {data?.source === "preview" ? " · Preview" : null}
        </p>
      </motion.header>

      <motion.div className="dash-span" {...fade(1, reduced)}>
        <OverviewCards
          overview={data?.overview ?? null}
          loading={loading}
          error={errors.overview?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-order-health" {...fade(2, reduced)}>
        <HealthPanel
          health={data?.financialHealth ?? null}
          loading={loading}
          error={errors.financialHealth?.message}
          onRetry={retry}
        />
      </motion.div>
      <motion.div className="dash-order-flow" {...fade(2, reduced)}>
        <CashFlowPanel
          points={data?.cashFlow[range] ?? []}
          range={range}
          onRange={setRange}
          loading={loading}
          error={errors.cashFlow?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-order-spend" {...fade(3, reduced)}>
        <SpendingPanel
          items={data?.spending ?? []}
          loading={loading}
          error={errors.spending?.message}
          onRetry={retry}
        />
      </motion.div>
      <motion.div className="dash-order-budget" {...fade(3, reduced)}>
        <BudgetPanel
          budget={data?.budget ?? null}
          loading={loading}
          error={errors.budget?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-span dash-order-insights" {...fade(4, reduced)}>
        <InsightsPanel
          insights={data?.insights ?? []}
          loading={loading}
          error={errors.insights?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-order-goals" {...fade(5, reduced)}>
        <GoalsPanel
          goals={data?.goals ?? []}
          loading={loading}
          error={errors.goals?.message}
          onRetry={retry}
        />
      </motion.div>
      <motion.div className="dash-order-upcoming" {...fade(5, reduced)}>
        <UpcomingPanel
          items={data?.upcoming ?? []}
          loading={loading}
          error={errors.upcoming?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-span dash-order-tx" {...fade(6, reduced)}>
        <TransactionsPanel
          items={data?.recentTransactions ?? []}
          loading={loading}
          error={errors.recentTransactions?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-order-invest" {...fade(7, reduced)}>
        <InvestmentsPanel
          investments={
            data?.investments ?? {
              connected: false,
              value: 0,
              gain: 0,
              gainPct: 0,
              slices: [],
            }
          }
          loading={loading}
          error={errors.investments?.message}
          onRetry={retry}
        />
      </motion.div>
      <motion.div className="dash-order-debt" {...fade(7, reduced)}>
        <DebtPanel
          debt={
            data?.debt ?? {
              hasDebt: false,
              outstanding: 0,
              monthlyPayments: 0,
              items: [],
            }
          }
          loading={loading}
          error={errors.debt?.message}
          onRetry={retry}
        />
      </motion.div>

      <motion.div className="dash-span dash-order-moves" {...fade(8, reduced)}>
        <MovesPanel
          items={data?.recommendations ?? []}
          loading={loading}
          error={errors.recommendations?.message}
          onRetry={retry}
        />
      </motion.div>
    </div>
  );
}
