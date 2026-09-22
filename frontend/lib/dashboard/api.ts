import { api } from "@/lib/api";

import type { DashboardPayload } from "./types";

function unwrapPayload(body: unknown): DashboardPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const data = (record.data ?? record) as DashboardPayload;
  if (!data || typeof data !== "object") return null;
  if (!("hasLedger" in data) && !("overview" in data)) return null;
  return data;
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const response = await api.get("/api/dashboard");
  const payload = unwrapPayload(response.data);
  if (!payload) {
    throw new Error("Dashboard payload was empty");
  }
  return {
    ...payload,
    source: payload.source ?? "live",
    errors: payload.errors ?? {},
    cashFlow: payload.cashFlow ?? {
      "7D": [],
      "30D": [],
      "3M": [],
      "6M": [],
      "1Y": [],
    },
  };
}
