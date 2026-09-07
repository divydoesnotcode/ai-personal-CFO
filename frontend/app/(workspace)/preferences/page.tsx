import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Financial Preferences — AI Personal CFO" };

export default function PreferencesPage() {
  return (
    <LedgerSubpage
      kicker="Policy"
      title="Financial Preferences"
      body="Currency stays INR. Risk, savings targets, and emergency-fund months will be configurable here without changing the product’s visual identity."
    />
  );
}
