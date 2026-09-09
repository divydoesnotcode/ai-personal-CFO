"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { api } from "./api";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  subscribeAuth,
  type AuthSession,
} from "./auth-storage";
import { invalidateAccountCache, signOutRequest } from "./account-api";
import { invalidateDashboardCache } from "./dashboard/use-dashboard";
import { invalidateLedgerCache } from "./ledger-api";

type UseAuthOptions = {
  requireAuth?: boolean;
  redirectTo?: string;
};

let verifiedToken: string | null = null;
let meInflight: Promise<void> | null = null;

function clearClientCaches() {
  verifiedToken = null;
  meInflight = null;
  clearAuthSession();
  invalidateDashboardCache();
  invalidateLedgerCache();
  invalidateAccountCache();
}

export function rememberVerifiedToken(token: string) {
  verifiedToken = token;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, redirectTo = "/signin" } = options;
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuth,
    loadAuthSession,
    () => null,
  );
  const token = session?.token ?? null;

  const endSession = useCallback(() => {
    clearClientCaches();
    router.push("/signin");
  }, [router]);

  const logout = useCallback(() => {
    void signOutRequest().catch(() => undefined);
    endSession();
  }, [endSession]);

  useEffect(() => {
    if (!token) {
      verifiedToken = null;
      if (requireAuth) {
        router.replace(redirectTo);
      }
      return;
    }

    if (verifiedToken === token) {
      return;
    }

    const current = loadAuthSession();
    if (!current || current.token !== token) {
      return;
    }

    if (!meInflight) {
      meInflight = api
        .get("/api/auth/me")
        .then((response) => {
          const user = response.data?.data;
          if (!user?.id || !user?.email) return;
          verifiedToken = token;
          const latest = loadAuthSession();
          if (!latest || latest.token !== token) return;
          const next: AuthSession = {
            token,
            user: {
              id: user.id,
              name: user.name ?? latest.user.name,
              email: user.email,
            },
          };
          if (
            next.user.name !== latest.user.name ||
            next.user.email !== latest.user.email
          ) {
            saveAuthSession(next);
          }
        })
        .catch((error: unknown) => {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            clearClientCaches();
            if (requireAuth) {
              router.replace(redirectTo);
            }
          }
        })
        .finally(() => {
          meInflight = null;
        });
    }
  }, [redirectTo, requireAuth, router, token]);

  return { session, ready: true, logout, endSession, user: session?.user ?? null };
}
