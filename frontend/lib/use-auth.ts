"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "./api";
import {
  clearAuthSession,
  getAuthSession,
  getAuthStatus,
  markUnauthenticated,
  setAuthSession,
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
 *
 * Strategy (called exactly once per page lifetime):
 *
 * 1. If the in-memory token is already set (e.g. login happened in this tab
 *    before this component mounted), mark initialized and return immediately.
 *
 * 2. Otherwise call POST /auth/refresh.
 *    - The browser automatically sends the ``cfo_refresh_token`` HttpOnly
 *      cookie (path "/api/auth").
 *    - On success: receive a fresh access token + rotated refresh cookie.
 *      Store the access token in memory.
 *    - On 401: the refresh token is absent, expired, or revoked.
 *      Mark the user as unauthenticated.
 *
 * We skip GET /auth/me on page load and go straight to /auth/refresh because:
 *   a) /auth/me only returns PublicUser — it doesn't give us a token to hold
 *      in memory for Bearer-header requests.
 *   b) If the access-token cookie is still valid, /auth/refresh still works
 *      fine (it uses the refresh token cookie, not the access cookie).
 *   c) This is one request instead of potentially two.
 *
 * GET /auth/me is still available for the Axios request interceptor to use
 * after the in-memory token has been established.
 */
function ensureInitialized(): Promise<void> {
  if (_initialized) return Promise.resolve();
  if (getAuthSession() !== null) {
    _initialized = true;
    return Promise.resolve();
  }
  if (_initPromise) return _initPromise;

  type RefreshBody = {
    data: { token: string; user: { id: string; name: string; email: string } };
  };

  _initPromise = api
    .post<RefreshBody>("/api/auth/refresh", null)
    .then((res) => {
      const { token, user } = res.data.data;
      if (token && user?.id && user?.email) {
        setAuthSession({ token, user });
      } else {
        markUnauthenticated();
      }
    })
    .catch((error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // No valid refresh token — user is genuinely unauthenticated.
        markUnauthenticated();
      } else {
        // Network error or server error: fail open so a transient backend
        // outage doesn't lock users out on refresh.
        markUnauthenticated();
      }
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

  const endSession = useCallback(() => {
    // Reset the init flag so the next page load re-checks.
    _initialized = false;
    clearClientCaches();
    router.push("/signin");
  }, [router]);

  const logout = useCallback(() => {
    void signOutRequest().catch(() => undefined);
    endSession();
  }, [endSession]);

  // ---- Page-load init ----

  useEffect(() => {
    void ensureInitialized();
  }, []);

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
