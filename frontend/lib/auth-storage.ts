/**
 * In-memory auth session store.
 *
 * The access token is NEVER written to localStorage or sessionStorage.
 * It lives only in this module-level variable and is lost on page refresh.
 * Page-refresh recovery is handled by calling GET /auth/me (which reads
 * the HttpOnly access-token cookie that the browser sends automatically).
 *
 * This module is the single source of truth for the client-side auth state.
 */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  /** Short-lived JWT held in memory — never persisted to storage. */
  token: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

let _session: AuthSession | null = null;
let _status: AuthStatus = "loading";

const _listeners = new Set<() => void>();

function _notify(): void {
  _listeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// External store interface (for useSyncExternalStore)
// ---------------------------------------------------------------------------

export function subscribeAuth(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

/** Snapshot of the current session (null while loading or unauthenticated). */
export function getAuthSession(): AuthSession | null {
  return _session;
}

/** Snapshot of the current auth status. */
export function getAuthStatus(): AuthStatus {
  return _status;
}

// ---------------------------------------------------------------------------
// Mutators
// ---------------------------------------------------------------------------

export function setAuthSession(session: AuthSession): void {
  _session = session;
  _status = "authenticated";
  _notify();
}

export function clearAuthSession(): void {
  _session = null;
  _status = "unauthenticated";
  _notify();
}

/** Called only during auth initialization — marks loading as done without a session. */
export function markUnauthenticated(): void {
  _session = null;
  _status = "unauthenticated";
  _notify();
}

// ---------------------------------------------------------------------------
// Convenience accessor used by the Axios request interceptor
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  return _session?.token ?? null;
}
