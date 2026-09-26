"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchOnboardingStatus, type OnboardingStatusData } from "./onboarding-api";

let globalOnboardingStatus: OnboardingStatusData | null = null;
const listeners = new Set<() => void>();

export function setGlobalOnboardingCompleted(completed = true) {
  if (globalOnboardingStatus) {
    globalOnboardingStatus = {
      ...globalOnboardingStatus,
      completed,
      step: 5,
    };
  } else {
    globalOnboardingStatus = {
      completed,
      step: 5,
      accounts: [],
      income: {
        income_source: "Primary Employment / Salary",
        monthly_income: "100000",
        record_initial_income: true,
      },
      policy: {
        savings_target: 20,
        emergency_months: 6,
        risk_tolerance: "moderate",
      },
      budgets: [],
    };
  }
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // noop
    }
  });
}

export function useOnboarding(enabled = true) {
  const [status, setStatus] = useState<OnboardingStatusData | null>(globalOnboardingStatus);
  const [loading, setLoading] = useState(!globalOnboardingStatus);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await fetchOnboardingStatus();
      globalOnboardingStatus = data;
      setStatus(data);
    } catch {
      // unauthenticated or network error
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    const onChange = () => setStatus(globalOnboardingStatus ? { ...globalOnboardingStatus } : null);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return {
    status,
    loading,
    refresh,
    isCompleted: status?.completed ?? false,
    step: status?.step ?? 1,
  };
}
