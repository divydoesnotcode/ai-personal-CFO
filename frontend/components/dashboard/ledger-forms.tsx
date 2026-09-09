"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { invalidateDashboardCache } from "@/lib/dashboard/use-dashboard";
import {
  createAccount,
  createGoal,
  createTransaction,
  listAccounts,
  listBudgets,
  listCategories,
  listGoals,
  upsertBudget,
  type LedgerAccount,
  type LedgerBudget,
  type LedgerCategory,
  type LedgerGoal,
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

export function TransactionComposer() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [status, setStatus] = useState("posted");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<"idle" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAccounts(), listCategories()])
      .then(([nextAccounts, nextCategories]) => {
        if (cancelled) return;
        setAccounts(nextAccounts);
        setCategories(nextCategories);
        if (nextAccounts[0]) setAccountId(nextAccounts[0].id);
      })
      .catch((error) => {
        if (cancelled) return;
        setTone("error");
        setMessage(getApiErrorMessage(error, "Unable to load ledger options"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setTone("error");
      setMessage("Enter an amount greater than zero");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await createTransaction({
        amount: value,
        transaction_type: type,
        status,
        account_id: accountId || null,
        category_id: categoryId || null,
        description: description.trim() || undefined,
        merchant_name: description.trim() || undefined,
        transaction_date: new Date(when).toISOString(),
      });
      invalidateDashboardCache();
      setTone("ok");
      setMessage("Transaction recorded");
      setAmount("");
      setDescription("");
      router.push("/dashboard");
    } catch (error) {
      setTone("error");
      setMessage(getApiErrorMessage(error, "Unable to record the transaction"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cfo-panel dash-panel">
      <Corners accent />
      <div className="cfo-panel-head">
        <strong>Add a transaction</strong>
        <span>LEDGER</span>
      </div>
      <form className="cfo-form dash-ledger-form" onSubmit={onSubmit}>
        <Field label="Amount (₹)">
          <input
            className="cfo-input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label="Type">
          <select className="cfo-input" value={type} onChange={(event) => setType(event.target.value)}>
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
          <select className="cfo-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="posted">Posted</option>
            <option value="pending">Upcoming</option>
          </select>
        </Field>
        <Field label="Account">
          <select className="cfo-input" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Cash (created if needed)</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select className="cfo-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((category) => (
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
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </Field>
        <Field label="Description">
          <input
            className="cfo-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Salary, rent, Swiggy…"
          />
        </Field>
        <FormStatus tone={tone} message={message} />
        <button type="submit" className="cfo-btn cfo-btn--ghost" disabled={busy}>
          {busy ? "Saving…" : "Record transaction"}
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
