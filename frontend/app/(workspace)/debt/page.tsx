import type { Metadata } from "next";

import { AccountComposer } from "@/components/dashboard/ledger-forms";

export const metadata: Metadata = { title: "Debt — AI Personal CFO" };

export default function DebtPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Liabilities</p>
        <h1>Debt</h1>
        <p>
          Add a credit card or loan so outstanding balances and payments can
          appear on the dashboard.
        </p>
        <AccountComposer defaultType="loan" title="Add a liability" />
      </div>
    </div>
  );
}
