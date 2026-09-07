import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Goals — AI Personal CFO" };

export default function GoalsPage() {
  return (
    <LedgerSubpage
      kicker="Targets"
      title="Financial Goals"
      body="Name the target, the amount, and the date. Progress on the dashboard stays honest to the ledger."
      action="Add a goal"
    />
  );
}
