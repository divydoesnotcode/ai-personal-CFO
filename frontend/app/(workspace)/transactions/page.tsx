import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Transactions — AI Personal CFO" };

export default function TransactionsPage() {
  return (
    <LedgerSubpage
      kicker="Ledger"
      title="Transactions"
      body="Import or add movements here. The dashboard reads this ledger for cash flow, spending, and upcoming commitments."
      action="Add a transaction"
    />
  );
}
