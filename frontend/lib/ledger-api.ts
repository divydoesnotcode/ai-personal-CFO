import { api } from "./api";

type CacheKey = "accounts" | "categories" | "goals" | "budgets";

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

export function invalidateLedgerCache(...keys: CacheKey[]) {
  const targets: CacheKey[] =
    keys.length > 0 ? keys : ["accounts", "categories", "goals", "budgets"];
  for (const key of targets) {
    cache.delete(key);
    inflight.delete(key);
  }
}

export type LedgerAccount = {
  id: string;
  name: string;
  account_type: string;
  balance: number | string;
  is_active: boolean;
};

export type LedgerCategory = {
  id: string;
  name: string;
  is_system: boolean;
};

export type LedgerGoal = {
  id: string;
  name: string;
  goal_type: string;
  target_amount: number | string;
  current_amount: number | string;
  target_date: string;
};

export type LedgerBudget = {
  id: string;
  category_id: string;
  category_name: string;
  monthly_limit: number | string;
};

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listAccounts() {
  return cached("accounts", async () => {
    const response = await api.get<Envelope<LedgerAccount[]>>("/api/accounts");
    return response.data.data;
  });
}

export async function createAccount(payload: {
  name: string;
  account_type: string;
  balance?: number;
  description?: string;
}) {
  const response = await api.post<Envelope<LedgerAccount>>("/api/accounts", payload);
  invalidateLedgerCache("accounts");
  return response.data.data;
}

export async function listCategories() {
  return cached("categories", async () => {
    const response = await api.get<Envelope<LedgerCategory[]>>("/api/categories");
    return response.data.data;
  });
}

export async function createTransaction(payload: {
  amount: number;
  transaction_type: string;
  account_id?: string | null;
  category_id?: string | null;
  description?: string;
  merchant_name?: string;
  transaction_date?: string;
  status?: string;
}) {
  const response = await api.post("/api/transactions", payload);
  invalidateLedgerCache("accounts");
  return response.data.data;
}

export async function listGoals() {
  return cached("goals", async () => {
    const response = await api.get<Envelope<LedgerGoal[]>>("/api/goals");
    return response.data.data;
  });
}

export async function createGoal(payload: {
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}) {
  const response = await api.post("/api/goals", payload);
  invalidateLedgerCache("goals");
  return response.data.data;
}

export async function listBudgets() {
  return cached("budgets", async () => {
    const response = await api.get<Envelope<LedgerBudget[]>>("/api/budgets");
    return response.data.data;
  });
}

export async function upsertBudget(payload: {
  category_id: string;
  monthly_limit: number;
}) {
  const response = await api.put("/api/budgets", payload);
  invalidateLedgerCache("budgets");
  return response.data.data;
}
