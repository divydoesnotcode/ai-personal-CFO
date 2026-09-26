"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatINR, formatPercent } from "@/lib/format-money";
import type { LedgerTransaction } from "@/lib/ledger-api";
import { Corners, Panel } from "../ui";

function isIncome(type: string) {
  return type === "income" || type === "refund" || type === "dividend" || type === "interest";
}

function isExpense(type: string) {
  return type === "expense" || type === "fee" || type === "loan_payment";
}

export function ComparisonReport({
  transactions,
}: {
  transactions: LedgerTransaction[];
}) {
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(d.toISOString().slice(0, 7));
    }
    transactions.forEach((tx) => {
      if (tx.transaction_date) set.add(tx.transaction_date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const [periodA, setPeriodA] = useState(availableMonths[0] || "");
  const [periodB, setPeriodB] = useState(availableMonths[1] || availableMonths[0] || "");

  // Calculate stats for a given month
  const getPeriodStats = (monthKey: string) => {
    const txs = transactions.filter(
      (tx) => tx.transaction_date && tx.transaction_date.startsWith(monthKey)
    );
    let income = 0;
    let expense = 0;
    const catMap = new Map<string, number>();

    txs.forEach((tx) => {
      const amt = Number(tx.amount);
      if (isIncome(tx.transaction_type)) {
        income += amt;
      } else if (isExpense(tx.transaction_type)) {
        expense += amt;
        const cat = tx.category_name || "General";
        catMap.set(cat, (catMap.get(cat) || 0) + amt);
      }
    });

    const net = income - expense;
    const rate = income > 0 ? (net / income) * 100 : 0;
    return { income, expense, net, rate, catMap, txsCount: txs.length };
  };

  const statsA = useMemo(() => getPeriodStats(periodA), [periodA, transactions]);
  const statsB = useMemo(() => getPeriodStats(periodB), [periodB, transactions]);

  // Combined categories
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    statsA.catMap.forEach((_, k) => set.add(k));
    statsB.catMap.forEach((_, k) => set.add(k));
    return Array.from(set).sort();
  }, [statsA, statsB]);

  const formatMonthLabel = (m: string) => {
    if (!m) return "—";
    const [y, mn] = m.split("-");
    return new Date(Number(y), Number(mn) - 1, 1).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const incomeDelta = statsA.income - statsB.income;
  const expenseDelta = statsA.expense - statsB.expense;
  const netDelta = statsA.net - statsB.net;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Panel title="Historical Period Comparison" meta="COMPARE" accent>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="comp-period-a" style={{ fontFamily: "var(--cfo-mono)", fontSize: "0.78rem", color: "var(--cfo-accent)", textTransform: "uppercase" }}>
              Period A (Base):
            </label>
            <select
              id="comp-period-a"
              className="cfo-input"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
              value={periodA}
              onChange={(e) => setPeriodA(e.target.value)}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <span style={{ color: "var(--cfo-ink-faint)", fontWeight: 700 }}>VS</span>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="comp-period-b" style={{ fontFamily: "var(--cfo-mono)", fontSize: "0.78rem", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Period B (Compare):
            </label>
            <select
              id="comp-period-b"
              className="cfo-input"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
              value={periodB}
              onChange={(e) => setPeriodB(e.target.value)}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Delta Overview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <article className="cfo-card" style={{ padding: "1rem" }}>
            <Corners />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Income Change
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", margin: "0.35rem 0", color: incomeDelta >= 0 ? "var(--cfo-pos)" : "var(--cfo-neg)" }}>
              {formatINR(incomeDelta, true)}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-faint)" }}>
              {formatMonthLabel(periodA)} vs {formatMonthLabel(periodB)}
            </span>
          </article>

          <article className="cfo-card" style={{ padding: "1rem" }}>
            <Corners />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Expense Change
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", margin: "0.35rem 0", color: expenseDelta <= 0 ? "var(--cfo-pos)" : "var(--cfo-danger)" }}>
              {formatINR(expenseDelta, true)}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-faint)" }}>
              {expenseDelta <= 0 ? "Lower outflow in Period A" : "Higher outflow in Period A"}
            </span>
          </article>

          <article className="cfo-card" style={{ padding: "1rem" }}>
            <Corners />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Net Savings Surplus Shift
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", margin: "0.35rem 0", color: netDelta >= 0 ? "var(--cfo-pos)" : "var(--cfo-danger)" }}>
              {formatINR(netDelta, true)}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-faint)" }}>
              {statsA.rate.toFixed(0)}% vs {statsB.rate.toFixed(0)}% rate
            </span>
          </article>
        </div>

        {/* Category-by-Category Shift Table */}
        <div className="dash-tx-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>{formatMonthLabel(periodA)}</th>
                <th style={{ textAlign: "right" }}>{formatMonthLabel(periodB)}</th>
                <th style={{ textAlign: "right" }}>Difference</th>
                <th style={{ textAlign: "right" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {allCategories.length > 0 ? (
                allCategories.map((cat) => {
                  const valA = statsA.catMap.get(cat) || 0;
                  const valB = statsB.catMap.get(cat) || 0;
                  const diff = valA - valB;
                  const pct = valB > 0 ? (diff / valB) * 100 : valA > 0 ? 100 : 0;
                  return (
                    <tr key={cat}>
                      <td><strong>{cat}</strong></td>
                      <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>
                        {formatINR(valA)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-dim)" }}>
                        {formatINR(valB)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: diff <= 0 ? "var(--cfo-pos)" : "var(--cfo-danger)" }}>
                        {formatINR(diff, true)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {diff === 0 ? (
                          <span className="cfo-badge"><Minus size={11} /> 0%</span>
                        ) : diff < 0 ? (
                          <span className="cfo-badge cfo-badge--ok"><ArrowDownRight size={11} /> {formatPercent(Math.abs(pct), 0)}</span>
                        ) : (
                          <span className="cfo-badge cfo-badge--warn"><ArrowUpRight size={11} /> {formatPercent(pct, 0)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--cfo-ink-dim)" }}>
                    No categorized expenses recorded in selected periods.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
