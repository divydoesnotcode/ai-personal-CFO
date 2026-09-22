import type { Metadata } from "next";

import { TransactionsView } from "@/components/dashboard/transactions-view";

export const metadata: Metadata = { title: "Transactions — AI Personal CFO" };

export default function TransactionsPage() {
  return <TransactionsView />;
}
