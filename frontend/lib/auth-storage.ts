/**
 * Client-side auth session store with localStorage persistence & in-memory caching.
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
  token: string;
  refreshToken?: string | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const STORAGE_KEY = "cfo.auth.session";

function loadStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === "string" && parsed.user?.id) {
      return parsed as AuthSession;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

// ---------------------------------------------------------------------------
// State Initialization
// ---------------------------------------------------------------------------

const initialSession = loadStoredSession();
let _session: AuthSession | null = initialSession;
let _status: AuthStatus = initialSession ? "authenticated" : "loading";

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

/** Snapshot of the current session (null while unauthenticated). */
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
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage quota errors
    }
  }
  _notify();
}

export function clearAuthSession(): void {
  _session = null;
  _status = "unauthenticated";
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  _notify();
}

/** Called when session refresh completely fails — resets stored credential state. */
export function markUnauthenticated(): void {
  _session = null;
  _status = "unauthenticated";
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  _notify();
}

// ---------------------------------------------------------------------------
// Convenience accessors used by the Axios client
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  return _session?.token ?? null;
}

export function getRefreshToken(): string | null {
  return _session?.refreshToken ?? null;
}
