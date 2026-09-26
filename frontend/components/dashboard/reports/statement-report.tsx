"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";

import { formatINR } from "@/lib/format-money";
import type { LedgerAccount, LedgerTransaction } from "@/lib/ledger-api";

function isIncome(type: string) {
  return type === "income" || type === "refund" || type === "dividend" || type === "interest";
}

function isExpense(type: string) {
  return type === "expense" || type === "fee" || type === "loan_payment";
}

export function StatementReport({
  transactions,
  accounts,
}: {
  transactions: LedgerTransaction[];
  accounts: LedgerAccount[];
}) {
  // Generate list of available months (YYYY-MM)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    // Default current month and past 6 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(d.toISOString().slice(0, 7));
    }
    transactions.forEach((tx) => {
      if (tx.transaction_date) {
        set.add(tx.transaction_date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths[0] || new Date().toISOString().slice(0, 7)
  );

  const monthTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transaction_date && tx.transaction_date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  // Income items
  const incomeItems = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((tx) => isIncome(tx.transaction_type))
      .forEach((tx) => {
        const cat = tx.category_name || "General Income";
        map.set(cat, (map.get(cat) || 0) + Number(tx.amount));
      });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
  }, [monthTransactions]);

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);

  // Expense items
  const expenseItems = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((tx) => isExpense(tx.transaction_type))
      .forEach((tx) => {
        const cat = tx.category_name || "General Expenses";
        map.set(cat, (map.get(cat) || 0) + Number(tx.amount));
      });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netSurplus = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSurplus / totalIncome) * 100) : 0;

  // Assets & Liabilities
  const assetAccounts = accounts.filter(
    (a) => a.account_type === "bank" || a.account_type === "savings" || a.account_type === "cash" || a.account_type === "investment"
  );
  const liabilityAccounts = accounts.filter(
    (a) => a.account_type === "credit_card" || a.account_type === "loan"
  );

  const totalAssets = assetAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const [year, monthNum] = selectedMonth.split("-");
  const monthName = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label htmlFor="statement-month-select" style={{ fontFamily: "var(--cfo-mono)", fontSize: "0.78rem", textTransform: "uppercase", color: "var(--cfo-ink-dim)" }}>
            Statement Period:
          </label>
          <select
            id="statement-month-select"
            className="cfo-input"
            style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.map((m) => {
              const [y, mn] = m.split("-");
              const label = new Date(Number(y), Number(mn) - 1, 1).toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
              });
              return (
                <option key={m} value={m}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          className="cfo-btn cfo-btn--ghost"
          onClick={() => window.print()}
        >
          <Printer size={14} /> Print / Save Statement PDF
        </button>
      </div>

      <div className="cfo-statement-doc">
        <div className="cfo-statement-header">
          <div>
            <span className="cfo-kicker">PERSONAL CFO STATEMENT</span>
            <h2 className="cfo-statement-title">Monthly Financial Report</h2>
            <p style={{ margin: "0.25rem 0 0", color: "var(--cfo-ink-dim)", fontSize: "0.85rem" }}>
              Period: <strong>{monthName}</strong>
            </p>
          </div>
          <div className="cfo-statement-meta">
            <div>CONFIDENTIAL &amp; PROPRIETARY</div>
            <div>STATUS: {netSurplus >= 0 ? "SURPLUS" : "DEFICIT"}</div>
            <div>SAVINGS RATE: {savingsRate}%</div>
          </div>
        </div>

        {/* Section 1: Income Statement */}
        <section className="cfo-statement-section">
          <div className="cfo-statement-section-title">
            I. Personal Operating Statement (P&amp;L)
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <strong style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--cfo-ink-dim)", fontFamily: "var(--cfo-mono)" }}>
              A. Cash Inflows &amp; Revenues
            </strong>
            {incomeItems.length > 0 ? (
              incomeItems.map((item) => (
                <div key={item.name} className="cfo-statement-row">
                  <span>{item.name}</span>
                  <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-pos)" }}>
                    {formatINR(item.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="cfo-statement-row">
                <span style={{ color: "var(--cfo-ink-faint)" }}>No recorded inflows</span>
                <span>₹0</span>
              </div>
            )}
            <div className="cfo-statement-row cfo-statement-row--total">
              <span>Total Operating Inflows</span>
              <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-pos)" }}>
                {formatINR(totalIncome)}
              </span>
            </div>
          </div>

          <div>
            <strong style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--cfo-ink-dim)", fontFamily: "var(--cfo-mono)" }}>
              B. Operating &amp; Living Outflows
            </strong>
            {expenseItems.length > 0 ? (
              expenseItems.map((item) => (
                <div key={item.name} className="cfo-statement-row">
                  <span>{item.name}</span>
                  <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-neg)" }}>
                    {formatINR(item.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="cfo-statement-row">
                <span style={{ color: "var(--cfo-ink-faint)" }}>No recorded expenses</span>
                <span>₹0</span>
              </div>
            )}
            <div className="cfo-statement-row cfo-statement-row--total">
              <span>Total Operating Outflows</span>
              <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-neg)" }}>
                {formatINR(totalExpenses)}
              </span>
            </div>
          </div>

          <div className="cfo-statement-row cfo-statement-row--total" style={{ fontSize: "1rem", marginTop: "1rem", background: "color-mix(in srgb, var(--cfo-bg-elevated) 90%, var(--cfo-line))", padding: "0.75rem" }}>
            <strong>NET MONTHLY SURPLUS / (DEFICIT)</strong>
            <strong style={{ fontFamily: "var(--cfo-mono)", color: netSurplus >= 0 ? "var(--cfo-pos)" : "var(--cfo-danger)" }}>
              {formatINR(netSurplus, true)}
            </strong>
          </div>
        </section>

        {/* Section 2: Month-End Balance Sheet */}
        <section className="cfo-statement-section">
          <div className="cfo-statement-section-title">
            II. Month-End Balance Sheet Snapshot
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <div>
              <strong style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--cfo-ink-dim)", fontFamily: "var(--cfo-mono)" }}>
                Assets (Cash, Bank &amp; Holdings)
              </strong>
              {assetAccounts.map((acc) => (
                <div key={acc.id} className="cfo-statement-row">
                  <span>{acc.name} <small style={{ color: "var(--cfo-ink-faint)" }}>({acc.account_type})</small></span>
                  <span style={{ fontFamily: "var(--cfo-mono)" }}>{formatINR(Number(acc.balance))}</span>
                </div>
              ))}
              <div className="cfo-statement-row cfo-statement-row--total">
                <span>Total Assets</span>
                <span style={{ fontFamily: "var(--cfo-mono)" }}>{formatINR(totalAssets)}</span>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--cfo-ink-dim)", fontFamily: "var(--cfo-mono)" }}>
                Liabilities (Credit &amp; Loans)
              </strong>
              {liabilityAccounts.length > 0 ? (
                liabilityAccounts.map((acc) => (
                  <div key={acc.id} className="cfo-statement-row">
                    <span>{acc.name} <small style={{ color: "var(--cfo-ink-faint)" }}>({acc.account_type})</small></span>
                    <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-danger)" }}>{formatINR(Number(acc.balance))}</span>
                  </div>
                ))
              ) : (
                <div className="cfo-statement-row">
                  <span style={{ color: "var(--cfo-ink-faint)" }}>No recorded debt</span>
                  <span>₹0</span>
                </div>
              )}
              <div className="cfo-statement-row cfo-statement-row--total">
                <span>Total Liabilities</span>
                <span style={{ fontFamily: "var(--cfo-mono)", color: "var(--cfo-danger)" }}>{formatINR(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          <div className="cfo-statement-row cfo-statement-row--total" style={{ fontSize: "1rem", marginTop: "1rem", padding: "0.75rem" }}>
            <strong>ESTIMATED NET WORTH POSITION</strong>
            <strong style={{ fontFamily: "var(--cfo-mono)" }}>
              {formatINR(netWorth)}
            </strong>
          </div>
        </section>

        {/* Section 3: AI CFO Audit & Verdict */}
        <section className="cfo-statement-verdict">
          <strong style={{ display: "block", marginBottom: "0.35rem", textTransform: "uppercase", fontFamily: "var(--cfo-mono)", fontSize: "0.8rem", color: "var(--cfo-accent)" }}>
            ✦ AI CFO Executive Audit &amp; Sign-off
          </strong>
          <p style={{ margin: 0 }}>
            {netSurplus > 0
              ? `During ${monthName}, you operated at a positive cash flow surplus of ${formatINR(netSurplus)} (${savingsRate}% savings rate). Operating expenses remained disciplined against monthly earnings. Recommended action: Direct surplus towards high-priority financial goals or investment allocation.`
              : netSurplus < 0
              ? `During ${monthName}, total outflows exceeded inflows by ${formatINR(Math.abs(netSurplus))}. Spending in discretionary categories outpaced standard monthly limits. Recommended action: Review top expense lines and pause non-essential purchases in the following cycle.`
              : `Operating inflows perfectly balanced outflows for ${monthName}. Maintain vigilant reserve buffers to build a resilient multi-month runway.`}
          </p>
        </section>
      </div>
    </div>
  );
}
