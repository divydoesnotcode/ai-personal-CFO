import type { Metadata } from "next";

import { ProfilePanel } from "@/components/dashboard/account-forms";

export const metadata: Metadata = { title: "Profile — AI Personal CFO" };

export default function ProfilePage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Identity</p>
        <h1>Profile</h1>
        <p>Name and email are the ledger identity. Changes apply across the workspace immediately.</p>
        <ProfilePanel />
      </div>
    </div>
  );
}
