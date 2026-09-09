import type { Metadata } from "next";

import { TransactionComposer } from "@/components/dashboard/ledger-forms";

export const metadata: Metadata = { title: "Transactions — AI Personal CFO" };

export default function TransactionsPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Ledger</p>
        <h1>Transactions</h1>
        <p>
          Posted movements feed cash flow, spending, and health. Upcoming
          (pending) items appear on the dashboard until they post.
        </p>
        <TransactionComposer />
      </div>
    </div>
  );
}
