"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getApiErrorMessage } from "@/lib/api";
import { invalidateLedgerCache } from "@/lib/ledger-api";

import { fetchDashboard } from "./api";
import type { DashboardPayload } from "./types";

type DashboardState = {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();
const emptyState: DashboardState = { data: null, loading: false, error: null };
let snapshot: DashboardState = emptyState;
let inflight: Promise<void> | null = null;

function emit(next: DashboardState) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot(): DashboardState {
  return emptyState;
}

async function loadDashboard(force = false) {
  if (!force && snapshot.data && !snapshot.error) {
    return;
  }
  if (inflight) {
    await inflight;
    return;
  }

  emit({
    data: snapshot.data,
    loading: snapshot.data == null,
    error: null,
  });

  inflight = fetchDashboard()
    .then((payload) => {
      inflight = null;
      emit({ data: payload, loading: false, error: null });
    })
    .catch((error: unknown) => {
      inflight = null;
      // 401s are handled transparently by the Axios interceptor in api.ts
      // (it will attempt a token refresh and retry). If the refresh also
      // fails, the auth store is cleared and the useAuth redirect guard
      // navigates to /signin. We just show the error here.
      emit({
        data: snapshot.data,
        loading: false,
        error: getApiErrorMessage(error, "Unable to load the dashboard"),
      });
    });

  await inflight;
}

export function invalidateDashboardCache() {
  inflight = null;
  emit(emptyState);
  if (listeners.size > 0 && getAccessToken()) {
    void loadDashboard(true);
  }
}

export function useDashboard(enabled = true) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!enabled) return;
    void loadDashboard();
  }, [enabled]);

  const retry = useCallback(() => {
    void loadDashboard(true);
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    retry,
  };
}
