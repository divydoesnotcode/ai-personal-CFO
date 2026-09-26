import type { Metadata } from "next";

import { DebtView } from "@/components/dashboard/debt-view";

export const metadata: Metadata = { title: "Debt — AI Personal CFO" };

export default function DebtPage() {
  return <DebtView />;
}
