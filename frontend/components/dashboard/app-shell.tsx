"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { applyLocalDensity, readLocalDensity } from "@/lib/account-api";
import { AskCfoProvider } from "@/lib/dashboard/ask-cfo";
import { useDashboard } from "@/lib/dashboard/use-dashboard";
import { useAuth } from "@/lib/use-auth";

import { AskCfoPanel } from "./ask-cfo-panel";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

const SIDEBAR_KEY = "cfo.nav.collapsed";
const SIDEBAR_EVENT = "cfo-nav-collapsed";

function subscribeSidebar(onStoreChange: () => void) {
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
}

function sidebarCollapsed() {
  return window.localStorage.getItem(SIDEBAR_KEY) === "1";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, status } = useAuth({ requireAuth: true });
  const { data } = useDashboard(Boolean(user));
  const reduced = useReducedMotion();
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    sidebarCollapsed,
    () => false,
  );
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    applyLocalDensity(readLocalDensity());
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  function toggleCollapsed() {
    const next = !sidebarCollapsed();
    window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  // Show a loading shell while the page-load auth check is in flight.
  // This prevents a flash-redirect to /signin before the refresh token
  // has been exchanged for a new access token.
  if (status === "loading" || !user) {
    return (
      <div className="dash-root">
        <div className="dash-content-inner" style={{ paddingTop: "4rem" }}>
          <p className="cfo-coords">Authenticating ledger identity…</p>
        </div>
      </div>
    );
  }

  const duration = reduced ? 0 : 0.2;

  return (
    <AskCfoProvider>
      <div className="dash-root">
        <motion.aside
          className={`dash-sidebar${collapsed ? " dash-sidebar--collapsed" : ""}`}
          aria-label="Primary"
          initial={false}
          animate={{ width: collapsed ? 64 : 232 }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </motion.aside>

        <div className="dash-main">
          <TopNav
            user={user}
            collapsed={collapsed}
            notifications={data?.notifications ?? []}
            onMenu={() => setDrawer(true)}
            onLogout={logout}
          />
          <div className="dash-content">{children}</div>
        </div>

        <AnimatePresence>
          {drawer ? (
            <>
              <motion.button
                type="button"
                className="dash-drawer-backdrop"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
                initial={{ opacity: reduced ? 1 : 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
              />
              <motion.aside
                className="dash-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                initial={reduced ? false : { x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { x: -16, opacity: 0 }}
                transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="dash-sidebar-brand">
                  <span className="dash-mark" aria-hidden="true">
                    CF
                  </span>
                  <span className="dash-brand-copy">
                    <strong>CFO // LEDGER</strong>
                    <span>AI Personal CFO</span>
                  </span>
                  <button
                    type="button"
                    className="dash-icon-btn"
                    aria-label="Close menu"
                    onClick={() => setDrawer(false)}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <Sidebar
                  collapsed={false}
                  onToggle={() => setDrawer(false)}
                  onNavigate={() => setDrawer(false)}
                  showBrand={false}
                  showCollapse={false}
                />
                <button
                  type="button"
                  className="dash-collapse"
                  onClick={logout}
                >
                  Logout
                </button>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <AskCfoPanel />
      </div>
    </AskCfoProvider>
  );
}
