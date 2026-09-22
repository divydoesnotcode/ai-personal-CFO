import type { ReactNode } from "react";
import "./auth.css";

/*
  Fonts are loaded globally in app/layout.tsx with --font-cfo-* variables.
  auth.css maps them to --auth-display / --auth-sans / --auth-mono via
  the --cfo-* tokens defined in globals.css.
*/

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-root">{children}</div>;
}
