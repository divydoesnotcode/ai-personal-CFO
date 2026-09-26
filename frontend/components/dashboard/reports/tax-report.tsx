"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";

import { formatINR } from "@/lib/format-money";
import type { LedgerTransaction } from "@/lib/ledger-api";
import { Corners, Panel } from "../ui";

function downloadTaxCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TaxReport({
  transactions,
}: {
  transactions: LedgerTransaction[];
}) {
  const [selectedFY, setSelectedFY] = useState("2025-2026");

  // Determine FY date bounds: April 1 of Year A to March 31 of Year B
  const [startYear, endYear] = selectedFY.split("-").map(Number);
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  const fyTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.transaction_date) return false;
      const d = tx.transaction_date.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Classify transactions into tax deduction buckets based on category name or description
  const taxBuckets = useMemo(() => {
    let sec80c = 0;
    let sec80d = 0;
    let interest24b = 0;
    let businessReimbursable = 0;

    const sec80cItems: LedgerTransaction[] = [];
    const sec80dItems: LedgerTransaction[] = [];
    const interestItems: LedgerTransaction[] = [];
    const businessItems: LedgerTransaction[] = [];

    fyTransactions.forEach((tx) => {
      const text = `${tx.category_name || ""} ${tx.description || ""} ${tx.merchant_name || ""}`.toLowerCase();
      const amt = Number(tx.amount);

      if (
        text.includes("investment") ||
        text.includes("elss") ||
        text.includes("ppf") ||
        text.includes("epf") ||
        text.includes("provident") ||
        text.includes("mutual fund") ||
        text.includes("life insurance") ||
        text.includes("lic")
      ) {
        sec80c += amt;
        sec80cItems.push(tx);
      } else if (
        text.includes("health insurance") ||
        text.includes("mediclaim") ||
        text.includes("medical") ||
        text.includes("hospital") ||
        text.includes("pharmacy")
      ) {
        sec80d += amt;
        sec80dItems.push(tx);
      } else if (
        text.includes("home loan") ||
        text.includes("housing loan") ||
        text.includes("interest") ||
        text.includes("education loan") ||
        tx.transaction_type === "loan_payment"
      ) {
        interest24b += amt;
        interestItems.push(tx);
      } else if (
        text.includes("client") ||
        text.includes("software") ||
        text.includes("domain") ||
        text.includes("hosting") ||
        text.includes("hardware") ||
        text.includes("business")
      ) {
        businessReimbursable += amt;
        businessItems.push(tx);
      }
    });

    const sec80cClaimable = Math.min(sec80c, 150000); // 1.5 Lakh limit
    const sec80dClaimable = Math.min(sec80d, 25000); // 25k standard limit

    return {
      sec80c,
      sec80cClaimable,
      sec80cItems,
      sec80d,
      sec80dClaimable,
      sec80dItems,
      interest24b,
      interestItems,
      businessReimbursable,
      businessItems,
      totalDeductions: sec80cClaimable + sec80dClaimable + interest24b + businessReimbursable,
    };
  }, [fyTransactions]);

  const handleExportTaxCsv = () => {
    const rows = [
      ["Financial Year", `FY ${selectedFY}`],
      ["Generated On", new Date().toISOString().slice(0, 10)],
      [],
      ["Tax Section", "Category / Description", "Amount (INR)", "Statutory Limit", "Eligible Claim"],
      ["Section 80C (Investments / PPF / ELSS)", "Eligible 80C Outflows", taxBuckets.sec80c, 150000, taxBuckets.sec80cClaimable],
      ["Section 80D (Health Insurance / Medical)", "Eligible 80D Outflows", taxBuckets.sec80d, 25000, taxBuckets.sec80dClaimable],
      ["Section 24(b) / Loan Interest", "Interest / Loan Repayments", taxBuckets.interest24b, "No strict limit", taxBuckets.interest24b],
      ["Business / Professional Reimbursables", "Work & Equipment", taxBuckets.businessReimbursable, "Actuals", taxBuckets.businessReimbursable],
      [],
      ["TOTAL ESTIMATED DEDUCTIONS CLAIMABLE", "", "", "", taxBuckets.totalDeductions],
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    downloadTaxCsv(`tax_deductions_FY_${selectedFY}.csv`, csvContent);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Panel title="Tax & Deductions Summary" meta="INCOME TAX (INDIA)" accent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="tax-fy-select" style={{ fontFamily: "var(--cfo-mono)", fontSize: "0.78rem", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Assessment Year / FY:
            </label>
            <select
              id="tax-fy-select"
              className="cfo-input"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
            >
              <option value="2026-2027">FY 2026-27 (AY 2027-28)</option>
              <option value="2025-2026">FY 2025-26 (AY 2026-27)</option>
              <option value="2024-2025">FY 2024-25 (AY 2025-26)</option>
            </select>
          </div>

          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            onClick={handleExportTaxCsv}
          >
            <Download size={14} /> Export Tax Ready CSV
          </button>
        </div>

        {/* Top Summary Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <article className="cfo-card" style={{ padding: "1.1rem" }}>
            <Corners />
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--cfo-accent)", marginBottom: "0.25rem" }}>
              <ShieldCheck size={16} />
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", textTransform: "uppercase" }}>Total Estimated Deductions</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink)" }}>
              {formatINR(taxBuckets.totalDeductions)}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--cfo-ink-dim)" }}>
              Eligible claims for FY {selectedFY}
            </span>
          </article>

          <article className="cfo-card" style={{ padding: "1.1rem" }}>
            <Corners />
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-dim)", textTransform: "uppercase" }}>
              Section 80C Utilization
            </span>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink)" }}>
              {formatINR(taxBuckets.sec80cClaimable)} <small style={{ fontSize: "0.85rem", color: "var(--cfo-ink-faint)" }}>/ ₹1.5L</small>
            </div>
            <span style={{ fontSize: "0.75rem", color: taxBuckets.sec80c >= 150000 ? "var(--cfo-pos)" : "var(--cfo-danger)" }}>
              {taxBuckets.sec80c >= 150000 ? "✓ 100% 80C Limit Maximized" : `${formatINR(150000 - taxBuckets.sec80cClaimable)} headroom remaining`}
            </span>
          </article>
        </div>

        {/* Deduction Sections Breakdown */}
        <div className="dash-tx-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Tax Section</th>
                <th>Qualifying Expense Scope</th>
                <th style={{ textAlign: "right" }}>Actual Spent</th>
                <th style={{ textAlign: "right" }}>Statutory Cap</th>
                <th style={{ textAlign: "right" }}>Claimable Deduction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Section 80C</strong></td>
                <td>ELSS, PPF, EPF, Life Insurance Premiums, Mutual Funds</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>{formatINR(taxBuckets.sec80c)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-faint)" }}>₹1,50,000</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-pos)" }}>{formatINR(taxBuckets.sec80cClaimable)}</td>
              </tr>
              <tr>
                <td><strong>Section 80D</strong></td>
                <td>Health Insurance Premiums &amp; Preventive Health Checkups</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>{formatINR(taxBuckets.sec80d)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-faint)" }}>₹25,000</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-pos)" }}>{formatINR(taxBuckets.sec80dClaimable)}</td>
              </tr>
              <tr>
                <td><strong>Section 24(b) / Loan Interest</strong></td>
                <td>Home Loan Interest, Education Loan EMI interest</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>{formatINR(taxBuckets.interest24b)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-faint)" }}>Actuals</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-pos)" }}>{formatINR(taxBuckets.interest24b)}</td>
              </tr>
              <tr>
                <td><strong>Business Reimbursable</strong></td>
                <td>Professional tools, hardware, domains &amp; client travel</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)" }}>{formatINR(taxBuckets.businessReimbursable)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", color: "var(--cfo-ink-faint)" }}>Actuals</td>
                <td style={{ textAlign: "right", fontFamily: "var(--cfo-mono)", fontWeight: 700, color: "var(--cfo-pos)" }}>{formatINR(taxBuckets.businessReimbursable)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
