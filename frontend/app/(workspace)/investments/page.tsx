import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Investments — AI Personal CFO" };

export default function InvestmentsPage() {
  return (
    <LedgerSubpage
      kicker="Portfolio"
      title="Investments"
      body="Connect holdings to let the CFO weigh allocation against cash, debt, and goals. Nothing is invented while the portfolio is disconnected."
      action="Connect investments"
    />
  );
}
