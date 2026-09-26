"use client";

import { useMemo } from "react";
import { AlertTriangle, Repeat, TrendingUp } from "lucide-react";

import { formatINR } from "@/lib/format-money";
import type { LedgerTransaction } from "@/lib/ledger-api";
import { Corners, Panel } from "../ui";

function isExpense(type: string) {
  return type === "expense" || type === "fee" || type === "loan_payment";
}

export function LifestyleReport({
  transactions,
}: {
  transactions: LedgerTransaction[];
}) {
  // Identify recurring subscriptions by finding merchants/descriptions that occur frequently with similar amounts
  const subscriptionAnalysis = useMemo(() => {
    const expenseTxs = transactions.filter((tx) => isExpense(tx.transaction_type));
    const merchantMap = new Map<
      string,
      { count: number; totalAmount: number; lastAmount: number; dates: string[]; category: string }
    >();

    expenseTxs.forEach((tx) => {
      const name = (tx.merchant_name || tx.description || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = merchantMap.get(key) || {
        count: 0,
        totalAmount: 0,
        lastAmount: Number(tx.amount),
        dates: [],
        category: tx.category_name || "General",
      };
      existing.count += 1;
      existing.totalAmount += Number(tx.amount);
      if (tx.transaction_date) existing.dates.push(tx.transaction_date.slice(0, 10));
      merchantMap.set(key, existing);
    });

    // Detect known subscription keywords or items with recurring counts
    const SUB_KEYWORDS = [
      "netflix",
      "spotify",
      "prime",
      "hotstar",
      "youtube",
      "apple",
      "icloud",
      "google",
      "gym",
      "broadband",
      "wifi",
      "airtel",
      "jio",
      "subscription",
      "membership",
      "aws",
      "chatgpt",
      "claude",
      "notion",
      "github",
      "swiggy one",
      "zomato gold",
    ];

    const subscriptions: {
      name: string;
      category: string;
      frequency: string;
      monthlyCost: number;
      annualRunRate: number;
    }[] = [];

    merchantMap.forEach((val, key) => {
      const isKnownSub = SUB_KEYWORDS.some((kw) => key.includes(kw));
      if (isKnownSub || val.count >= 2) {
        // Estimate monthly cost
        const avgMonthly = val.count >= 1 ? val.totalAmount / Math.max(1, Math.min(12, val.count)) : val.lastAmount;
        subscriptions.push({
          name: key.toUpperCase(),
          category: val.category,
          frequency: val.count >= 6 ? "Monthly" : val.count >= 2 ? "Periodic" : "Subscription",
          monthlyCost: avgMonthly,
          annualRunRate: avgMonthly * 12,
        });
      }
    });

    const totalAnnualSubDrain = subscriptions.reduce((sum, s) => sum + s.annualRunRate, 0);

    // Top merchant drain ranking
    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        name: name.toUpperCase(),
        count: data.count,
        totalAmount: data.totalAmount,
        category: data.category,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return { subscriptions, totalAnnualSubDrain, topMerchants };
  }, [transactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        <article className="cfo-card" style={{ padding: "1.2rem" }}>
          <Corners />
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--cfo-accent)", marginBottom: "0.25rem" }}>
            <Repeat size={16} />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", textTransform: "uppercase" }}>
              Annual Subscription Run-Rate
            </span>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink)" }}>
            {formatINR(subscriptionAnalysis.totalAnnualSubDrain)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-dim)" }}>
            Across {subscriptionAnalysis.subscriptions.length} detected recurring services
          </span>
        </article>

        <article className="cfo-card" style={{ padding: "1.2rem" }}>
          <Corners />
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--cfo-pos)", marginBottom: "0.25rem" }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", textTransform: "uppercase" }}>
              Discretionary Leak Alert
            </span>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink)" }}>
            {subscriptionAnalysis.subscriptions.length > 5 ? "Moderate Leak" : "Disciplined"}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-dim)" }}>
            {subscriptionAnalysis.subscriptions.length > 5
              ? "Audit subscriptions to trim unused memberships"
              : "No excessive recurring drains detected"}
          </span>
        </article>
      </div>

      {/* Subscriptions Table */}
      <Panel title="Recurring Services & Subscriptions" meta="RECURRING DRAIN" accent>
        <p style={{ marginBottom: "1rem", color: "var(--cfo-ink-dim)", fontSize: "0.85rem" }}>
          Automated audit of repeating recurring charges and digital subscriptions detected across your ledger.
        </p>

        <div className="dash-tx-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Service / Merchant</th>
                <th>Category</th>
                <th>Frequency</th>
                <th style={{ textAlign: "right" }}>Est. Monthly Cost</th>
                <th style={{ textAlign: "right" }}>Annualized Run-Rate</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionAnalysis.subscriptions.length > 0 ? (
                subscriptionAnalysis.subscriptions.map((sub) => (
                  <tr key={sub.name}>
                    <td><strong>{sub.name}</strong></td>
                    <td><span className="cfo-badge">{sub.category}</span></td>
                    <td>{sub.frequency}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>
                      {formatINR(sub.monthlyCost)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-danger)" }}>
                      {formatINR(sub.annualRunRate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--cfo-ink-dim)" }}>
                    No recurring subscriptions detected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Top Merchant Drains */}
      <Panel title="Top 10 Capital Outflow Destinations" meta="MERCHANT RANKING">
        <p style={{ marginBottom: "1rem", color: "var(--cfo-ink-dim)", fontSize: "0.85rem" }}>
          Merchants and payees that received the largest total cumulative payments from your accounts.
        </p>

        <div className="dash-tx-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Payee / Destination</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Transactions Count</th>
                <th style={{ textAlign: "right" }}>Total Cumulative Outflow</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionAnalysis.topMerchants.map((m, idx) => (
                <tr key={m.name}>
                  <td>
                    <strong>#{idx + 1} {m.name}</strong>
                  </td>
                  <td><span className="cfo-badge">{m.category}</span></td>
                  <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>{m.count}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-neg)" }}>
                    {formatINR(m.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
