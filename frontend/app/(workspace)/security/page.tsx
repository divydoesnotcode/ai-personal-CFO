import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Security — AI Personal CFO" };

export default function SecurityPage() {
  return (
    <LedgerSubpage
      kicker="Access"
      title="Security"
      body="Sessions are stored on this machine. Expired tokens return you to sign-in. Password and session controls will expand here."
    />
  );
}
