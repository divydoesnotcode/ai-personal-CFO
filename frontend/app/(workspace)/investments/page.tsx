import type { Metadata } from "next";

import { AccountComposer } from "@/components/dashboard/ledger-forms";

export const metadata: Metadata = { title: "Investments — AI Personal CFO" };

export default function InvestmentsPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Portfolio</p>
        <h1>Investments</h1>
        <p>
          Add an investment account so the dashboard can weigh allocation against
          cash, debt, and goals.
        </p>
        <AccountComposer defaultType="investment" title="Connect holdings" />
      </div>
    </div>
  );
}
