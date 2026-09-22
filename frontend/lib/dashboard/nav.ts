export type AppNavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "transactions"
    | "budgets"
    | "goals"
    | "investments"
    | "debt"
    | "cfo"
    | "reports"
    | "settings";
};

export const PRIMARY_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/budgets", label: "Budgets", icon: "budgets" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/investments", label: "Investments", icon: "investments" },
  { href: "/debt", label: "Debt", icon: "debt" },
  { href: "/cfo", label: "AI CFO", icon: "cfo" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

export const SECONDARY_NAV: AppNavItem[] = [
  { href: "/settings", label: "Settings", icon: "settings" },
];

export const PROFILE_MENU = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/preferences", label: "Financial Preferences" },
  { href: "/security", label: "Security" },
] as const;
