import axios from "axios";

import { api } from "@/lib/api";
import { DASHBOARD_FIXTURE, emptyDashboard } from "@/lib/mock-data/dashboard";

import type { CashFlowRange, DashboardPayload } from "./types";

function allowPreviewLedger(): boolean {
  if (process.env.NEXT_PUBLIC_DASHBOARD_FIXTURE === "0") return false;
  if (process.env.NEXT_PUBLIC_DASHBOARD_FIXTURE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function isUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return (
    !error.response ||
    status === 404 ||
    status === 405 ||
    status === 501 ||
    status === 503
  );
}

function unwrapPayload(body: unknown): DashboardPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const data = (record.data ?? record) as DashboardPayload;
  if (!data || typeof data !== "object") return null;
  if (!("hasLedger" in data) && !("overview" in data)) return null;
  return data;
}

export async function fetchDashboard(
  range: CashFlowRange,
): Promise<DashboardPayload> {
  try {
    const response = await api.get("/api/dashboard", {
      params: { range },
    });
    const payload = unwrapPayload(response.data);
    if (!payload) {
      throw new Error("Dashboard payload was empty");
    }
    return { ...payload, source: "live" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw error;
    }

    if (isUnavailable(error) && allowPreviewLedger()) {
      return DASHBOARD_FIXTURE;
    }

    if (isUnavailable(error)) {
      return emptyDashboard();
    }

    throw error;
  }
}
