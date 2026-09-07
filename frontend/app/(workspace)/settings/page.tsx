import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Settings — AI Personal CFO" };

export default function SettingsPage() {
  return (
    <LedgerSubpage
      kicker="System"
      title="Settings"
      body="Workspace preferences stay local to this identity. Display, density, and notification rules will land here."
    />
  );
}
