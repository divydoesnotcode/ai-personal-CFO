import type { Metadata } from "next";

import { LedgerSubpage } from "@/components/dashboard/subpage";

export const metadata: Metadata = { title: "Profile — AI Personal CFO" };

export default function ProfilePage() {
  return (
    <LedgerSubpage
      kicker="Identity"
      title="Profile"
      body="Your name and email come from the signed-in ledger identity. Additional profile fields will not be stored in the URL."
    />
  );
}
