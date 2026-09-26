"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getOrStartRefresh } from "./api";
import {
  clearAuthSession,
  getAuthSession,
  getAuthStatus,
  markUnauthenticated,
  subscribeAuth,
  type AuthSession,
  type AuthStatus,
} from "./auth-storage";
import { invalidateAccountCache, signOutRequest } from "./account-api";
import { invalidateDashboardCache } from "./dashboard/use-dashboard";
import { invalidateLedgerCache } from "./ledger-api";

// ---------------------------------------------------------------------------
// Module-level singletons (survive re-renders, reset on logout)
// ---------------------------------------------------------------------------

/** Whether the page-load auth check has completed (success or failure). */
let _initialized = false;
/** De-duplicates the single page-load check across simultaneous callers. */
let _initPromise: Promise<void> | null = null;
const AUTH_LOGOUT_EVENT = "cfo.auth.logout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearClientCaches(): void {
  clearAuthSession();
  invalidateDashboardCache();
  invalidateLedgerCache();
  invalidateAccountCache();
}

// ---------------------------------------------------------------------------
// Auth initializer
// ---------------------------------------------------------------------------

/**
 * Page-load session restore.
 * Uses unified getOrStartRefresh() to prevent race conditions on token rotation.
 */
function ensureInitialized(): Promise<void> {
  if (_initialized) return Promise.resolve();
  if (getAuthSession() !== null) {
    _initialized = true;
    return Promise.resolve();
  }
  if (_initPromise) return _initPromise;

  _initPromise = getOrStartRefresh()
    .then((token) => {
      if (!token) {
        markUnauthenticated();
      }
    })
    .catch(() => {
      markUnauthenticated();
    })
    .finally(() => {
      _initialized = true;
      _initPromise = null;
    });

  return _initPromise;
}

// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

type UseAuthOptions = {
  requireAuth?: boolean;
  redirectTo?: string;
};

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, redirectTo = "/signin" } = options;
  const router = useRouter();

  // Subscribe to the in-memory store via React's external store primitive.
  const session = useSyncExternalStore<AuthSession | null>(
    subscribeAuth,
    getAuthSession,
    () => null,
  );

  const status = useSyncExternalStore<AuthStatus>(
    subscribeAuth,
    getAuthStatus,
    () => "loading" as AuthStatus,
  );

  // ---- Actions ----

  const endSession = useCallback((broadcast = true) => {
    // Reset the init flag so the next page load re-checks.
    _initialized = false;
    clearClientCaches();
    if (broadcast) {
      // Notify other tabs without persisting any credential or user data.
      window.localStorage.setItem(AUTH_LOGOUT_EVENT, String(Date.now()));
    }
    router.push("/signin");
  }, [router]);

  const logout = useCallback(() => {
    return signOutRequest().then(() => {
      endSession();
    });
  }, [endSession]);

  // ---- Page-load init ----

  useEffect(() => {
    void ensureInitialized();
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== AUTH_LOGOUT_EVENT) return;
      endSession(false);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [endSession]);

  // ---- Redirect guard ----

  useEffect(() => {
    // KEY FIX: never redirect while auth is still being determined.
    if (status === "loading") return;

    if (requireAuth && status === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [status, requireAuth, redirectTo, router]);

  return {
    session,
    status,
    /**
     * True once the page-load auth check has completed.
     * @deprecated Prefer checking `status !== 'loading'` directly.
     */
    ready: status !== "loading",
    logout,
    endSession,
    user: session?.user ?? null,
  };
}

export { type AuthStatus };
