"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { invalidateDashboardCache } from "@/lib/dashboard/use-dashboard";
import {
  createAccount,
  createGoal,
  createTransaction,
  updateTransaction,
  listAccounts,
  listBudgets,
  listCategories,
  listGoals,
  upsertBudget,
  type LedgerAccount,
  type LedgerBudget,
  type LedgerCategory,
  type LedgerGoal,
  type LedgerTransaction,
} from "@/lib/ledger-api";

import { Corners } from "./ui";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="cfo-field">
      <span className="cfo-label">{label}</span>
      {children}
    </label>
  );
}

function FormStatus({
  tone,
  message,
}: {
  tone: "idle" | "error" | "ok";
  message: string;
}) {
  if (!message) return null;
  return (
    <p className={tone === "error" ? "cfo-error" : "cfo-hint"} role={tone === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

function toDateTimeLocalValue(dateStr?: string | Date) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function TransactionComposer({
  transaction,
  onSuccess,
  onCancel,
  redirectToDashboard = true,
}: {
  transaction?: LedgerTransaction | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  redirectToDashboard?: boolean;
} = {}) {
  const router = useRouter();
  const [state, setState] = useState({
    accounts: [] as LedgerAccount[],
    categories: [] as LedgerCategory[],
    amount: transaction ? String(transaction.amount) : "",
    type: transaction ? transaction.transaction_type : "expense",
    status: transaction ? transaction.status : "posted",
    accountId: transaction ? transaction.account_id || "" : "",
    categoryId: transaction ? transaction.category_id || "" : "",
    description: transaction
      ? transaction.description || transaction.merchant_name || ""
      : "",
    when: toDateTimeLocalValue(transaction?.transaction_date),
    busy: false,
    tone: "idle" as "idle" | "error" | "ok",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAccounts(), listCategories()])
      .then(([nextAccounts, nextCategories]) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          accounts: nextAccounts,
          categories: nextCategories,
          accountId: transaction ? prev.accountId : (prev.accountId || nextAccounts[0]?.id || ""),
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          tone: "error",
          message: getApiErrorMessage(error, "Unable to load ledger options"),
        }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(state.amount);
    if (!Number.isFinite(value) || value <= 0) {
      setState((prev) => ({
        ...prev,
        tone: "error",
        message: "Enter an amount greater than zero",
      }));
      return;
    }
    setState((prev) => ({ ...prev, busy: true, message: "" }));
    try {
      const payload = {
        amount: value,
        transaction_type: state.type,
        status: state.status,
        account_id: state.accountId || null,
        category_id: state.categoryId || null,
        description: state.description.trim() || undefined,
        merchant_name: state.description.trim() || undefined,
        transaction_date: new Date(state.when).toISOString(),
      };
      if (transaction?.id) {
        await updateTransaction(transaction.id, payload);
      } else {
        await createTransaction(payload);
      }
      invalidateDashboardCache();
      setState((prev) => ({
        ...prev,
        tone: "ok",
        message: transaction ? "Transaction updated" : "Transaction recorded",
        amount: "",
        description: "",
      }));
      if (onSuccess) {
        onSuccess();
      } else if (redirectToDashboard) {
        router.push("/dashboard");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        tone: "error",
        message: getApiErrorMessage(
          error,
          transaction
            ? "Unable to update the transaction"
            : "Unable to record the transaction"
        ),
      }));
    } finally {
      setState((prev) => ({ ...prev, busy: false }));
    }
  }

  return (
    <section className="cfo-panel dash-panel">
      <Corners accent />
      <div className="cfo-panel-head">
        <strong>{transaction ? "Edit transaction" : "Add a transaction"}</strong>
        {onCancel ? (
          <button
            type="button"
            className="dash-icon-btn"
            aria-label="Close dialog"
            onClick={onCancel}
          >
            ✕
          </button>
        ) : (
          <span>LEDGER</span>
        )}
      </div>
      <form className="cfo-form dash-ledger-form" onSubmit={onSubmit}>
        <Field label="Amount (₹)">
          <input
            className="cfo-input"
            type="number"
            min="0.01"
            step="0.01"
            value={state.amount}
            onChange={(event) =>
              setState((prev) => ({ ...prev, amount: event.target.value }))
            }
            required
          />
        </Field>
        <Field label="Type">
          <select
            className="cfo-input"
            value={state.type}
            onChange={(event) =>
              setState((prev) => ({ ...prev, type: event.target.value }))
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="loan_payment">Loan payment</option>
            <option value="fee">Fee</option>
            <option value="refund">Refund</option>
            <option value="interest">Interest</option>
            <option value="dividend">Dividend</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            className="cfo-input"
            value={state.status}
            onChange={(event) =>
              setState((prev) => ({ ...prev, status: event.target.value }))
            }
          >
            <option value="posted">Posted</option>
            <option value="pending">Upcoming</option>
          </select>
        </Field>
        <Field label="Account">
          <select
            className="cfo-input"
            value={state.accountId}
            onChange={(event) =>
              setState((prev) => ({ ...prev, accountId: event.target.value }))
            }
          >
            {state.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            className="cfo-input"
            value={state.categoryId}
            onChange={(event) =>
              setState((prev) => ({ ...prev, categoryId: event.target.value }))
            }
          >
            <option value="">Uncategorized</option>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="When">
          <input
            className="cfo-input"
            type="datetime-local"
            value={state.when}
            onChange={(event) =>
              setState((prev) => ({ ...prev, when: event.target.value }))
            }
          />
        </Field>
        <Field label="Description">
          <input
            className="cfo-input"
            value={state.description}
            onChange={(event) =>
              setState((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Salary, rent, Swiggy…"
          />
        </Field>
        <FormStatus tone={state.tone} message={state.message} />
        <button type="submit" className="cfo-btn cfo-btn--ghost" disabled={state.busy}>
          {state.busy ? "Saving…" : transaction ? "Save changes" : "Record transaction"}
        </button>
      </form>
    </section>
  );
}

export function GoalComposer() {
  const router = useRouter();
  const [goals, setGoals] = useState<LedgerGoal[]>([]);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("savings");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<"idle" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .catch((error) => {
        setTone("error");
        setMessage(getApiErrorMessage(error, "Unable to load goals"));
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const targetAmount = Number(target);
    const currentAmount = Number(current);
    if (!name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0 || !targetDate) {
      setTone("error");
      setMessage("Name, target amount, and date are required");
      return;
    }
    setBusy(true);
    try {
      await createGoal({
        name: name.trim(),
        goal_type: goalType,
        target_amount: targetAmount,
        current_amount: Number.isFinite(currentAmount) ? currentAmount : 0,
        target_date: targetDate,
      });
      invalidateDashboardCache();
      setName("");
      setTarget("");
      setCurrent("0");
      setTone("ok");
      setMessage("Goal saved");
      router.push("/dashboard");
    } catch (error) {
      setTone("error");
      setMessage(getApiErrorMessage(error, "Unable to save the goal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cfo-panel dash-panel">
      <Corners accent />
      <div className="cfo-panel-head">
        <strong>Add a goal</strong>
        <span>TARGET</span>
      </div>
      {goals.length > 0 ? (
        <ul className="dash-ledger-list">
          {goals.map((goal) => (
            <li key={goal.id}>
              <span>{goal.name}</span>
              <b>
                ₹{Number(goal.current_amount).toLocaleString("en-IN")} / ₹
                {Number(goal.target_amount).toLocaleString("en-IN")}
              </b>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="cfo-form dash-ledger-form" onSubmit={onSubmit}>
        <Field label="Name">
          <input className="cfo-input" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Type">
          <select className="cfo-input" value={goalType} onChange={(event) => setGoalType(event.target.value)}>
            <option value="emergency_fund">Emergency fund</option>
            <option value="savings">Savings</option>
            <option value="education">Education</option>
            <option value="home">Home</option>
            <option value="vehicle">Vehicle</option>
            <option value="travel">Travel</option>
            <option value="investment">Investment</option>
            <option value="debt_payoff">Debt payoff</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Target (₹)">
          <input className="cfo-input" type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} required />
        </Field>
        <Field label="Current (₹)">
          <input className="cfo-input" type="number" min="0" step="1" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </Field>
        <Field label="Target date">
          <input className="cfo-input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required />
        </Field>
        <FormStatus tone={tone} message={message} />
        <button type="submit" className="cfo-btn cfo-btn--ghost" disabled={busy}>
          {busy ? "Saving…" : "Save goal"}
        </button>
      </form>
    </section>
  );
}

export function BudgetComposer() {
  const router = useRouter();
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [budgets, setBudgets] = useState<LedgerBudget[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<"idle" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([listCategories(), listBudgets()])
      .then(([nextCategories, nextBudgets]) => {
        setCategories(nextCategories.filter((item) => item.name !== "Income"));
        setBudgets(nextBudgets);
        if (nextCategories[0]) setCategoryId(nextCategories[0].id);
      })
      .catch((error) => {
        setTone("error");
        setMessage(getApiErrorMessage(error, "Unable to load budgets"));
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const monthly = Number(limit);
    if (!categoryId || !Number.isFinite(monthly) || monthly <= 0) {
      setTone("error");
      setMessage("Choose a category and a limit greater than zero");
      return;
    }
    setBusy(true);
    try {
      await upsertBudget({ category_id: categoryId, monthly_limit: monthly });
      invalidateDashboardCache();
      setTone("ok");
      setMessage("Budget saved");
      setLimit("");
      router.push("/dashboard");
    } catch (error) {
      setTone("error");
      setMessage(getApiErrorMessage(error, "Unable to save the budget"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cfo-panel dash-panel">
      <Corners accent />
      <div className="cfo-panel-head">
        <strong>Monthly limits</strong>
        <span>BUDGET</span>
      </div>
      {budgets.length > 0 ? (
        <ul className="dash-ledger-list">
          {budgets.map((budget) => (
            <li key={budget.id}>
              <span>{budget.category_name}</span>
              <b>₹{Number(budget.monthly_limit).toLocaleString("en-IN")}</b>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="cfo-form dash-ledger-form" onSubmit={onSubmit}>
        <Field label="Category">
          <select className="cfo-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monthly limit (₹)">
          <input className="cfo-input" type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} required />
        </Field>
        <FormStatus tone={tone} message={message} />
        <button type="submit" className="cfo-btn cfo-btn--ghost" disabled={busy}>
          {busy ? "Saving…" : "Save budget"}
        </button>
      </form>
    </section>
  );
}

export function AccountComposer({
  defaultType = "bank",
  title = "Add an account",
}: {
  defaultType?: string;
  title?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState(defaultType);
  const [balance, setBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<"idle" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const opening = Number(balance);
    if (!name.trim()) {
      setTone("error");
      setMessage("Enter an account name");
      return;
    }
    setBusy(true);
    try {
      await createAccount({
        name: name.trim(),
        account_type: accountType,
        balance: Number.isFinite(opening) ? opening : 0,
      });
      invalidateDashboardCache();
      setTone("ok");
      setMessage("Account created");
      setName("");
      router.push("/dashboard");
    } catch (error) {
      setTone("error");
      setMessage(getApiErrorMessage(error, "Unable to create the account"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cfo-panel dash-panel">
      <Corners accent />
      <div className="cfo-panel-head">
        <strong>{title}</strong>
        <span>ACCOUNT</span>
      </div>
      <form className="cfo-form dash-ledger-form" onSubmit={onSubmit}>
        <Field label="Name">
          <input className="cfo-input" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Type">
          <select className="cfo-input" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
            <option value="bank">Bank</option>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit card</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
          </select>
        </Field>
        <Field label="Opening balance (₹)">
          <input className="cfo-input" type="number" min="0" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} />
        </Field>
        <FormStatus tone={tone} message={message} />
        <button type="submit" className="cfo-btn cfo-btn--ghost" disabled={busy}>
          {busy ? "Saving…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
