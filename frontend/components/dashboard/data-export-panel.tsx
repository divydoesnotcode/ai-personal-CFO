"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import {
  listAccounts,
  listBudgets,
  listCategories,
  listGoals,
  listTransactions,
} from "@/lib/ledger-api";

import { Corners, Panel } from "./ui";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function DataExportPanel() {
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    setMessage(null);
    try {
      const txs = await listTransactions(500);
      const headers = [
        "Date",
        "Description",
        "Merchant",
        "Account",
        "Category",
        "Type",
        "Amount (INR)",
        "Status",
      ];
      const rows = (txs || []).map((t) => [
        t.transaction_date ? t.transaction_date.slice(0, 10) : "",
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(t.merchant_name || "").replace(/"/g, '""')}"`,
        `"${(t.account_name || "Cash").replace(/"/g, '""')}"`,
        `"${(t.category_name || "Uncategorized").replace(/"/g, '""')}"`,
        t.transaction_type,
        t.amount,
        t.status,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(csvContent, `personal_cfo_transactions_${dateStr}.csv`, "text/csv;charset=utf-8;");
      setMessage("CSV file exported successfully.");
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Failed to export CSV"));
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    setMessage(null);
    try {
      const [accounts, categories, transactions, budgets, goals] = await Promise.all([
        listAccounts(),
        listCategories(),
        listTransactions(500),
        listBudgets(),
        listGoals(),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          accounts,
          categories,
          transactions,
          budgets,
          goals,
        },
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(
        jsonStr,
        `personal_cfo_backup_${dateStr}.json`,
        "application/json;charset=utf-8;"
      );
      setMessage("Full JSON backup exported successfully.");
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Failed to export JSON backup"));
    } finally {
      setExportingJson(false);
    }
  };

  return (
    <Panel title="Data & Portability" meta="BACKUP" accent>
      <p style={{ marginBottom: "1.25rem", color: "var(--cfo-ink-dim)" }}>
        Download your financial ledger records anytime for offline analysis, spreadsheet import, or accounting backups.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        <article className="cfo-card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Corners />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--cfo-accent)" }} />
            <strong style={{ fontSize: "0.95rem" }}>Transactions (CSV)</strong>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--cfo-ink-dim)", flex: 1 }}>
            Standard comma-separated table format, ideal for Excel, Google Sheets, or tax preparation.
          </p>
          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            disabled={exportingCsv}
            onClick={handleExportCsv}
          >
            <Download size={14} /> {exportingCsv ? "Exporting…" : "Download CSV"}
          </button>
        </article>

        <article className="cfo-card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Corners />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileJson size={20} style={{ color: "var(--cfo-accent)" }} />
            <strong style={{ fontSize: "0.95rem" }}>Full Ledger Backup (JSON)</strong>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--cfo-ink-dim)", flex: 1 }}>
            Complete structured archive containing accounts, categories, transactions, budgets, and goals.
          </p>
          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            disabled={exportingJson}
            onClick={handleExportJson}
          >
            <Download size={14} /> {exportingJson ? "Exporting…" : "Download JSON"}
          </button>
        </article>
      </div>

      {message ? (
        <p className="cfo-banner cfo-banner--ok" style={{ marginTop: "1rem" }}>
          {message}
        </p>
      ) : null}
    </Panel>
  );
}
