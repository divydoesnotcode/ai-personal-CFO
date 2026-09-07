import type { ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";

import "./workspace.css";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}