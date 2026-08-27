import axios, { AxiosError } from "axios";

import { getAccessToken } from "./auth-storage";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
