import type { Metadata } from "next";

import { GoalComposer } from "@/components/dashboard/ledger-forms";

export const metadata: Metadata = { title: "Goals — AI Personal CFO" };

export default function GoalsPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Targets</p>
        <h1>Financial Goals</h1>
        <p>Name the target, the amount, and the date. The dashboard tracks whether you are on pace.</p>
        <GoalComposer />
      </div>
    </div>
  );
}
