import type { Metadata } from "next";

import { SettingsPanel } from "@/components/dashboard/account-forms";

export const metadata: Metadata = { title: "Settings — AI Personal CFO" };

export default function SettingsPage() {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">System</p>
        <h1>Settings</h1>
        <p>Density and notification rules are stored with this identity, not in the URL.</p>
        <SettingsPanel />
      </div>
    </div>
  );
}
