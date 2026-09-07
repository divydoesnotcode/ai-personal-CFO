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

type UseAuthOptions = {
  requireAuth?: boolean;
  redirectTo?: string;
};

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, redirectTo = "/signin" } = options;
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuth,
    loadAuthSession,
    () => null,
  );

  const logout = useCallback(() => {
    clearAuthSession();
    router.push("/signin");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!session) {
      if (requireAuth) {
        router.replace(redirectTo);
      }
      return;
    }

    let cancelled = false;

    api
      .get("/api/auth/me")
      .then((response) => {
        if (cancelled) return;
        const user = response.data?.data;
        if (user?.id && user?.email) {
          const next: AuthSession = {
            token: session.token,
            user: {
              id: user.id,
              name: user.name ?? session.user.name,
              email: user.email,
            },
          };
          if (
            next.user.name !== session.user.name ||
            next.user.email !== session.user.email
          ) {
            saveAuthSession(next);
          }
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearAuthSession();
          if (requireAuth) {
            router.replace(redirectTo);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [redirectTo, requireAuth, router, session]);

  return { session, ready: true, logout, user: session?.user ?? null };
}
