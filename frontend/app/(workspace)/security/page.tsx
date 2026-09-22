import type { Metadata } from "next";

import { SecurityPanel } from "@/components/dashboard/account-forms";

export const metadata: Metadata = { title: "Security — AI Personal CFO" };

export default function SecurityPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Access</p>
        <h1>Security</h1>
        <p>
          Change your password and manage devices. Signing out a session or
          rotating the password invalidates that token immediately.
        </p>
        <SecurityPanel />
      </div>
    </div>
  );
}
