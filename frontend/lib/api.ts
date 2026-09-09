import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  clearAuthSession,
  getAccessToken,
  setAuthSession,
} from "./auth-storage";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Always send HttpOnly cookies (refresh token, access cookie)
});

// ---------------------------------------------------------------------------
// Request interceptor — attach in-memory access token
// ---------------------------------------------------------------------------

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Refresh state — single in-flight refresh promise (deduplication)
// ---------------------------------------------------------------------------

let _refreshPromise: Promise<string | null> | null = null;

/**
 * Call POST /auth/refresh.
 * Returns the new access token, or null if the refresh token is
 * expired/revoked (the user must sign in again).
 *
 * Multiple simultaneous 401 errors share the same promise so we never
 * fire more than one refresh request at a time.
 */
function getOrStartRefresh(): Promise<string | null> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = axios
    .post<{ data: { token: string; user: { id: string; name: string; email: string } } }>(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/auth/refresh`,
      null,
      { withCredentials: true },
    )
    .then((res) => {
      const { token, user } = res.data.data;
      setAuthSession({ token, user });
      return token;
    })
    .catch(() => {
      // Refresh token expired or revoked — clear in-memory session.
      clearAuthSession();
      return null;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

// ---------------------------------------------------------------------------
// Response interceptor — silent token refresh on 401
// ---------------------------------------------------------------------------

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryConfig | undefined;

    // Only attempt refresh on 401. Never retry /auth/refresh or /auth/signin
    // themselves (avoids infinite loops).
    const url = originalRequest?.url ?? "";
    const is401 = error.response?.status === 401;
    const isAuthEndpoint =
      url.includes("/auth/refresh") ||
      url.includes("/auth/signin") ||
      url.includes("/auth/me");

    if (is401 && !isAuthEndpoint && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await getOrStartRefresh();

      if (!newToken) {
        // Refresh failed — caller gets the original 401.
        return Promise.reject(error);
      }

      // Patch the Authorization header and retry the original request.
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Error helpers (unchanged)
// ---------------------------------------------------------------------------

export type AuthErrorBody = {
  success?: boolean;
  message?: string;
  detail?: unknown;
};

export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed",
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const axiosError = error as AxiosError<AuthErrorBody>;

  if (!axiosError.response) {
    return "Network error — identity service unreachable";
  }

  const data = axiosError.response.data;

  if (data && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    const first = data.detail[0] as { msg?: string } | undefined;
    if (first?.msg) {
      return first.msg.replace(/^Value error,\s*/i, "");
    }
  }

  return fallback;
}

export function fieldErrorsFromValidation(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) {
    return {};
  }

  const detail = (error.response.data as AuthErrorBody | undefined)?.detail;
  if (!Array.isArray(detail)) {
    return {};
  }

  const mapped: Record<string, string> = {};

  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const field = loc[loc.length - 1];
    if (typeof field !== "string" || mapped[field]) {
      continue;
    }
    const message =
      typeof item.msg === "string"
        ? item.msg.replace(/^Value error,\s*/i, "")
        : "Invalid value";
    mapped[field] = message;
  }

  return mapped;
}
