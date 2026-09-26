"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { applyLocalDensity, readLocalDensity } from "@/lib/account-api";
import { getApiErrorMessage } from "@/lib/api";
import {
  POST_LOGIN_GUARD_ORIGIN,
  POST_LOGIN_GUARD_PENDING,
  POST_LOGIN_GUARD_STATE,
} from "@/lib/auth-navigation";
import { AskCfoProvider } from "@/lib/dashboard/ask-cfo";
import { useDashboard } from "@/lib/dashboard/use-dashboard";
import { useAuth } from "@/lib/use-auth";

import { AskCfoPanel } from "./ask-cfo-panel";
import { LoadingIndicator } from "./loading-indicator";
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
  const { data, loading, refreshing } = useDashboard(Boolean(user));
  const reduced = useReducedMotion();
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    sidebarCollapsed,
    () => false,
  );
  const [drawer, setDrawer] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const cancelLogoutRef = useRef<HTMLButtonElement>(null);
  const logoutFromBackRef = useRef(false);
  const guardOriginRef = useRef<string | null>(null);

  useEffect(() => {
    applyLocalDensity(readLocalDensity());
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  useEffect(() => {
    if (!logoutOpen || logoutBusy) return;
    cancelLogoutRef.current?.focus();
  }, [logoutBusy, logoutOpen]);

  function requestLogout(fromBack = false) {
    logoutFromBackRef.current = fromBack;
    setLogoutError("");
    setLogoutOpen(true);
  }

  function cancelLogout() {
    if (logoutBusy) return;
    setLogoutOpen(false);
    setLogoutError("");

    if (logoutFromBackRef.current) {
      logoutFromBackRef.current = false;
      // Return to the guard entry instead of pushing or replacing history.
      // This leaves the original sign-in entry untouched for the next Back.
      window.history.forward();
    }
  }

  async function confirmLogout() {
    setLogoutBusy(true);
    setLogoutError("");

    try {
      await logout();
    } catch (error) {
      setLogoutError(
        getApiErrorMessage(error, "Unable to log out. Please try again."),
      );
      setLogoutBusy(false);
    }
  }

  useEffect(() => {
    if (window.history.state?.[POST_LOGIN_GUARD_STATE]) {
      guardOriginRef.current =
        window.history.state[POST_LOGIN_GUARD_ORIGIN] ?? null;
      return;
    }

    if (window.sessionStorage.getItem(POST_LOGIN_GUARD_PENDING) !== "1") {
      return;
    }

    window.sessionStorage.removeItem(POST_LOGIN_GUARD_PENDING);
    const origin = window.crypto.randomUUID();
    const currentState = window.history.state ?? {};
    guardOriginRef.current = origin;
    window.history.replaceState(
      { ...currentState, [POST_LOGIN_GUARD_ORIGIN]: origin },
      "",
      window.location.href,
    );
    window.history.pushState(
      {
        ...window.history.state,
        [POST_LOGIN_GUARD_ORIGIN]: origin,
        [POST_LOGIN_GUARD_STATE]: true,
      },
      "",
      window.location.href,
    );
  }, []);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (event.state?.[POST_LOGIN_GUARD_STATE]) return;

      // While the dialog is open, keep Back from travelling beyond the
      // authenticated entry. This does not add or replace a history entry.
      if (logoutOpen) {
        window.history.forward();
        return;
      }

      // The only intercepted transition is guard → its tagged original
      // workspace entry. Browser Back between other authenticated pages
      // remains unchanged.
      if (
        guardOriginRef.current &&
        event.state?.[POST_LOGIN_GUARD_ORIGIN] === guardOriginRef.current
      ) {
        requestLogout(true);
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [logoutOpen]);

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
        <LoadingIndicator active label="Authenticating ledger identity" />
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
        <LoadingIndicator active={loading || refreshing} />
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
            onLogout={requestLogout}
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
                transition{ duration }}
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
                  onClick={() => requestLogout()}
                >
                  Logout
                </button>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {logoutOpen ? (
            <>
              <motion.button
                type="button"
                className="dash-logout-backdrop"
                aria-label="Cancel logout"
                onClick={cancelLogout}
                disabled={logoutBusy}
                initial={{ opacity: reduced ? 1 : 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
              />
              <motion.section
                className="cfo-panel dash-logout-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-title"
                aria-describedby="logout-message"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="cfo-panel-head">
                  <strong id="logout-title">Logout?</strong>
                  <span>CONFIRM</span>
                </div>
                <p id="logout-message">Are you sure you want to logout?</p>
                {logoutError ? (
                  <p className="cfo-status cfo-status--error" role="alert">
                    {logoutError}
                  </p>
                ) : null}
                <div className="dash-logout-actions">
                  <button
                    ref={cancelLogoutRef}
                    type="button"
                    className="dash-quiet"
                    onClick={cancelLogout}
                    disabled={logoutBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cfo-btn cfo-btn--ghost"
                    onClick={confirmLogout}
                    disabled={logoutBusy}
                  >
                    {logoutBusy ? "Logging out…" : "Logout"}
                  </button>
                </div>
              </motion.section>
            </>
          ) : null}
        </AnimatePresence>

        <AskCfoPanel />
      </div>
    </AskCfoProvider>
  );
}
