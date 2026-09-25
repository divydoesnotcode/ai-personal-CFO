import type { Metadata } from "next";

import { BudgetsView } from "@/components/dashboard/budgets-view";

export const metadata: Metadata = { title: "Budgets — AI Personal CFO" };

export default function BudgetsPage() {
  return <BudgetsView />;
}
