"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import { clearAuthSession } from "@/lib/auth-storage";
import { getApiErrorMessage } from "@/lib/api";

import { fetchDashboard } from "./api";
import type { CashFlowRange, DashboardPayload } from "./types";

type DashboardState = {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  range: CashFlowRange;
};

const cache = new Map<CashFlowRange, DashboardPayload>();
const inflight = new Map<CashFlowRange, Promise<DashboardPayload>>();

export function useDashboard(initialRange: CashFlowRange = "6M", enabled = true) {
  const [state, setState] = useState<DashboardState>({
    data: cache.get(initialRange) ?? null,
    loading: !cache.has(initialRange),
    error: null,
    range: initialRange,
  });
  const rangeRef = useRef(initialRange);

  const load = useCallback(async (range: CashFlowRange, force = false) => {
    rangeRef.current = range;
    if (!force && cache.has(range)) {
      setState({
        data: cache.get(range) ?? null,
        loading: false,
        error: null,
        range,
      });
      return;
    }

    setState((current) => ({
      ...current,
      loading: current.data == null,
      error: null,
      range,
    }));

    try {
      let request = inflight.get(range);
      if (!request) {
        request = fetchDashboard(range);
        inflight.set(range, request);
      }
      const payload = await request;
      inflight.delete(range);
      cache.set(range, payload);
      if (rangeRef.current !== range) return;
      setState({ data: payload, loading: false, error: null, range });
    } catch (error) {
      inflight.delete(range);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuthSession();
        window.location.replace("/signin");
        return;
      }
      if (rangeRef.current !== range) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: getApiErrorMessage(error, "Unable to load the dashboard"),
        range,
      }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load(initialRange);
  }, [enabled, initialRange, load]);

  const setRange = useCallback(
    (range: CashFlowRange) => {
      void load(range);
    },
    [load],
  );

  const retry = useCallback(() => {
    cache.delete(rangeRef.current);
    void load(rangeRef.current, true);
  }, [load]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    range: state.range,
    setRange,
    retry,
  };
}
