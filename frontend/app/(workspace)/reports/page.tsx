import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Reports — AI Personal CFO" };

export default function ReportsPage() {
  return (
    <LedgerSubpage
      kicker="Review"
      title="Reports"
      body="Period reviews and exports will sit here. The dashboard already carries the current picture."
    />
  );
}
