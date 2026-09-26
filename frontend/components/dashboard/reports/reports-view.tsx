"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Repeat,
  ShieldCheck,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import {
  listAccounts,
  listTransactions,
  type LedgerAccount,
  type LedgerTransaction,
} from "@/lib/ledger-api";

import { ComparisonReport } from "./comparison-report";
import { LifestyleReport } from "./lifestyle-report";
import { StatementReport } from "./statement-report";
import { TaxReport } from "./tax-report";
import { ResponsiveTabs } from "../responsive-tabs";
import { ErrorBlock, Skeleton } from "../ui";

export type ReportTab = "statement" | "comparison" | "tax" | "lifestyle";

interface ReportTabItem {
  id: ReportTab;
  label: string;
  icon: typeof FileText;
}

const REPORT_TABS: ReportTabItem[] = [
  { id: "statement", label: "Monthly Statement (P&L)", icon: FileText },
  { id: "comparison", label: "Historical Comparison", icon: BarChart3 },
  { id: "tax", label: "Tax & Deductions", icon: ShieldCheck },
  { id: "lifestyle", label: "Subscriptions & Leaks", icon: Repeat },
];

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>("statement");
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txs, accs] = await Promise.all([
        listTransactions(1000),
        listAccounts(),
      ]);
      setTransactions(txs || []);
      setAccounts(accs || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load financial data for reports"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="dash-content-inner">
      <div className="dash-subpage dash-subpage--wide">
        <div className="dash-page-header no-print">
          <div>
            <p className="cfo-kicker">Review &amp; Intelligence</p>
            <h1>Financial Reports</h1>
            <p>
              Formal statements, historical comparisons, tax deduction audit, and subscription leak analysis.
            </p>
          </div>
        </div>

        <ResponsiveTabs
          tabs={REPORT_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Reports navigation"
        />

        {loading ? (
          <Skeleton lines={8} />
        ) : error ? (
          <ErrorBlock message={error} onRetry={loadData} />
        ) : (
          <div className="dash-report-content">
            {activeTab === "statement" && (
              <StatementReport transactions={transactions} accounts={accounts} />
            )}
            {activeTab === "comparison" && (
              <ComparisonReport transactions={transactions} />
            )}
            {activeTab === "tax" && (
              <TaxReport transactions={transactions} />
            )}
            {activeTab === "lifestyle" && (
              <LifestyleReport transactions={transactions} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
