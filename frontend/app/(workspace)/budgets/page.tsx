import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Budgets — AI Personal CFO" };

export default function BudgetsPage() {
  return (
    <LedgerSubpage
      kicker="Limits"
      title="Budgets"
      body="Set monthly ceilings by category. Overruns surface as quiet warnings on the dashboard, not noise."
    />
  );
}
