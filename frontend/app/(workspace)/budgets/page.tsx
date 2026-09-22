import type { Metadata } from "next";

import { BudgetComposer } from "@/components/dashboard/ledger-forms";

export const metadata: Metadata = { title: "Budgets — AI Personal CFO" };

export default function BudgetsPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Limits</p>
        <h1>Budgets</h1>
        <p>Set monthly ceilings by category. Overruns surface as quiet warnings on the dashboard.</p>
        <BudgetComposer />
      </div>
    </div>
  );
}
