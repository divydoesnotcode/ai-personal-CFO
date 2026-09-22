import type { Metadata } from "next";

import { PreferencesPanel } from "@/components/dashboard/account-forms";

export const metadata: Metadata = { title: "Financial Preferences — AI Personal CFO" };

export default function PreferencesPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">Policy</p>
        <h1>Financial Preferences</h1>
        <p>
          Currency stays INR. Risk, savings target, and emergency-fund months
          persist with your identity.
        </p>
        <PreferencesPanel />
      </div>
    </div>
  );
}
