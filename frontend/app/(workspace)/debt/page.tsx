import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Debt — AI Personal CFO" };

export default function DebtPage() {
  return (
    <LedgerSubpage
      kicker="Liabilities"
      title="Debt"
      body="Outstanding balances and monthly payments live here. If there is none, the dashboard will say so plainly."
    />
  );
}
