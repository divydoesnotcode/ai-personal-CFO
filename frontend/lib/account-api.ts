import { api } from "./api";

type CacheKey = "profile" | "settings" | "preferences" | "security";

const cache = new Map<CacheKey, unknown>();
const inflight = new Map<CacheKey, Promise<unknown>>();

async function cached<T>(key: CacheKey, loader: () => Promise<T>): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  const request = loader()
    .then((value) => {
      cache.set(key, value);
      inflight.delete(key);
      return value;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, request);
  return request;
}

export function invalidateAccountCache(...keys: CacheKey[]) {
  const targets: CacheKey[] =
    keys.length > 0 ? keys : ["profile", "settings", "preferences", "security"];
  for (const key of targets) {
    cache.delete(key);
    inflight.delete(key);
  }
}

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type WorkspaceSettings = {
  density: "comfortable" | "compact";
  notifyBudget: boolean;
  notifyUpcoming: boolean;
  notifyGoals: boolean;
};

export type FinancialPreferences = {
  currency: string;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  monthlySavingsTargetPct: number;
  emergencyFundMonths: number;
};

export type DeviceSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  current: boolean;
};

export type SecuritySnapshot = {
  email: string;
  passwordChangedAt: string | null;
  sessions: DeviceSession[];
};

const SETTINGS_KEY = "cfo.settings.density";

export function readLocalDensity(): WorkspaceSettings["density"] {
  if (typeof window === "undefined") return "comfortable";
  return window.localStorage.getItem(SETTINGS_KEY) === "compact"
    ? "compact"
    : "comfortable";
}

export function applyLocalDensity(density: WorkspaceSettings["density"]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, density);
  document.documentElement.dataset.density = density;
}

export async function fetchProfile() {
  return cached("profile", async () => {
    const response = await api.get<Envelope<Profile>>("/api/profile");
    return response.data.data;
  });
}

export async function updateProfile(payload: { name?: string; email?: string }) {
  const response = await api.patch<Envelope<Profile>>("/api/profile", payload);
  cache.set("profile", response.data.data);
  return response.data.data;
}

export async function fetchSettings() {
  return cached("settings", async () => {
    const response = await api.get<Envelope<WorkspaceSettings>>("/api/settings");
    applyLocalDensity(response.data.data.density);
    return response.data.data;
  });
}

export async function updateSettings(payload: Partial<WorkspaceSettings>) {
  const response = await api.patch<Envelope<WorkspaceSettings>>("/api/settings", payload);
  cache.set("settings", response.data.data);
  applyLocalDensity(response.data.data.density);
  return response.data.data;
}

export async function fetchPreferences() {
  return cached("preferences", async () => {
    const response = await api.get<Envelope<FinancialPreferences>>("/api/preferences");
    return response.data.data;
  });
}

export async function updatePreferences(
  payload: Partial<Omit<FinancialPreferences, "currency">>,
) {
  const response = await api.patch<Envelope<FinancialPreferences>>(
    "/api/preferences",
    payload,
  );
  cache.set("preferences", response.data.data);
  return response.data.data;
}

export async function fetchSecurity() {
  return cached("security", async () => {
    const response = await api.get<Envelope<SecuritySnapshot>>("/api/security");
    return response.data.data;
  });
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}) {
  const response = await api.post<
    Envelope<{ token: string; user: Profile }>
  >("/api/security/password", payload);
  invalidateAccountCache("security", "profile");
  return response.data.data;
}

export async function revokeSession(sessionId: string) {
  const response = await api.post<Envelope<{ signedOut: boolean; sessionId: string }>>(
    `/api/security/sessions/${sessionId}/revoke`,
  );
  invalidateAccountCache("security");
  return response.data.data;
}

export async function signOutAll() {
  const response = await api.post<Envelope<{ signedOut: boolean }>>(
    "/api/security/signout-all",
  );
  invalidateAccountCache();
  return response.data.data;
}

export async function signOutRequest() {
  await api.post("/api/auth/signout");
}
