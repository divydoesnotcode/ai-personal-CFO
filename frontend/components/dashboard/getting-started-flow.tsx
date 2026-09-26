"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import { invalidateDashboardCache } from "@/lib/dashboard/use-dashboard";
import { listCategories, type LedgerCategory } from "@/lib/ledger-api";
import {
  fetchOnboardingStatus,
  submitStep1Accounts,
  submitStep2Income,
  submitStep3Policy,
  submitStep4Budgets,
  submitCompleteOnboarding,
} from "@/lib/onboarding-api";
import { setGlobalOnboardingCompleted } from "@/lib/use-onboarding";
import { formatINR } from "@/lib/format-money";
import { Corners } from "./ui";

interface AccountDraft {
  id: string;
  name: string;
  account_type: "bank" | "savings" | "cash" | "investment";
  balance: string;
  description: string;
}

interface BudgetDraft {
  category_id: string;
  category_name: string;
  limit: string;
}

const DEFAULT_ACCOUNTS: AccountDraft[] = [
  {
    id: "1",
    name: "Primary Salary / Checking",
    account_type: "bank",
    balance: "50000",
    description: "Main operating account",
  },
  {
    id: "2",
    name: "Physical Cash Reserve",
    account_type: "cash",
    balance: "5000",
    description: "Cash in hand & wallet",
  },
];

export function GettingStartedFlow({
  onCompleted,
}: {
  onCompleted?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<LedgerCategory[]>([]);

  // Step 1: Accounts
  const [accounts, setAccounts] = useState<AccountDraft[]>(DEFAULT_ACCOUNTS);

  // Step 2: Income
  const [incomeSource, setIncomeSource] = useState("Primary Employment / Salary");
  const [monthlyIncome, setMonthlyIncome] = useState("100000");
  const [recordInitialIncome, setRecordInitialIncome] = useState(true);

  // Step 3: Financial Policy
  const [savingsTarget, setSavingsTarget] = useState(20);
  const [emergencyMonths, setEmergencyMonths] = useState(6);
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "moderate" | "aggressive">("moderate");

  // Step 4: Budget Caps
  const [budgets, setBudgets] = useState<BudgetDraft[]>([]);

  // 1. Fetch persistent status directly from PostgreSQL on mount
  useEffect(() => {
    Promise.all([listCategories(), fetchOnboardingStatus()])
      .then(([cats, dbState]) => {
        setCategories(cats || []);

        if (dbState) {
          if (dbState.step) setStep(dbState.step);
          if (dbState.accounts && dbState.accounts.length > 0) {
            setAccounts(dbState.accounts as AccountDraft[]);
          }
          if (dbState.income?.income_source) {
            setIncomeSource(dbState.income.income_source);
          }
          if (dbState.income?.monthly_income) {
            setMonthlyIncome(dbState.income.monthly_income);
          }
          if (typeof dbState.income?.record_initial_income === "boolean") {
            setRecordInitialIncome(dbState.income.record_initial_income);
          }
          if (dbState.policy?.savings_target) {
            setSavingsTarget(dbState.policy.savings_target);
          }
          if (dbState.policy?.emergency_months) {
            setEmergencyMonths(dbState.policy.emergency_months);
          }
          if (dbState.policy?.risk_tolerance) {
            setRiskTolerance(dbState.policy.risk_tolerance);
          }

          if (dbState.budgets && dbState.budgets.length > 0) {
            setBudgets(
              dbState.budgets.map((b) => ({
                category_id: b.category_id,
                category_name: b.category_name || "",
                limit: String(b.monthly_limit),
              }))
            );
          } else {
            // Seed default budget suggestions
            const defaults: BudgetDraft[] = [];
            const findCat = (keywords: string[]) =>
              cats.find((c) => keywords.some((k) => c.name.toLowerCase().includes(k)));

            const housing = findCat(["rent", "housing", "mortgage", "home"]);
            if (housing) defaults.push({ category_id: housing.id, category_name: housing.name, limit: "25000" });

            const food = findCat(["grocer", "food", "dining", "meal"]);
            if (food) defaults.push({ category_id: food.id, category_name: food.name, limit: "15000" });

            const utils = findCat(["utilit", "bill", "electricity", "recharge"]);
            if (utils) defaults.push({ category_id: utils.id, category_name: utils.name, limit: "5000" });

            const transport = findCat(["transport", "fuel", "travel", "cab", "commute"]);
            if (transport) defaults.push({ category_id: transport.id, category_name: transport.name, limit: "6000" });

            setBudgets(defaults);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setInitialLoading(false);
      });
  }, []);

  const addAccountRow = () => {
    setAccounts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "Secondary Bank Account",
        account_type: "bank",
        balance: "10000",
        description: "Emergency / Alternate account",
      },
    ]);
  };

  const removeAccountRow = (id: string) => {
    if (accounts.length <= 1) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAccountDraft = (id: string, key: keyof AccountDraft, val: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [key]: val } : a))
    );
  };

  const updateBudgetLimit = (catId: string, limitVal: string) => {
    setBudgets((prev) =>
      prev.map((b) => (b.category_id === catId ? { ...b, limit: limitVal } : b))
    );
  };

  // STEP 1 PROCEED: Calls Step-1 API
  const handleProceedStep1 = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await submitStep1Accounts(accounts);
      if (res?.accounts && res.accounts.length > 0) {
        setAccounts(res.accounts as AccountDraft[]);
      }
      setStep(2);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save accounts to database"));
    } finally {
      setBusy(false);
    }
  };

  // STEP 2 PROCEED: Calls Step-2 API
  const handleProceedStep2 = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitStep2Income({
        income_source: incomeSource,
        monthly_income: monthlyIncome,
        record_initial_income: recordInitialIncome,
      });
      setStep(3);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save income details"));
    } finally {
      setBusy(false);
    }
  };

  // STEP 3 PROCEED: Calls Step-3 API
  const handleProceedStep3 = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitStep3Policy({
        savings_target: savingsTarget,
        emergency_months: emergencyMonths,
        risk_tolerance: riskTolerance,
      });
      setStep(4);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save financial policy"));
    } finally {
      setBusy(false);
    }
  };

  // STEP 4 PROCEED: Calls Step-4 API
  const handleProceedStep4 = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitStep4Budgets(budgets);
      setStep(5);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save budget limits"));
    } finally {
      setBusy(false);
    }
  };

  // STEP 5 FINAL LAUNCH: Calls Complete API
  const handleFinish = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitCompleteOnboarding();
      setGlobalOnboardingCompleted(true);
      invalidateDashboardCache();

      if (onCompleted) {
        onCompleted();
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to finalize workspace"));
      setBusy(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="dash-onboarding-container" style={{ textAlign: "center", padding: "4rem 0" }}>
        <p className="cfo-coords">Loading ledger initialization state from database…</p>
      </div>
    );
  }

  return (
    <div className="dash-onboarding-container">
      {/* Header Progress Matrix */}
      <div className="dash-onboarding-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div className="dash-onboarding-kicker">
            <span>INITIALIZATION MATRIX</span>
            <span className="dash-onboarding-dot">● DB PERSISTED</span>
          </div>
        </div>
        <h1>Welcome to AI Personal CFO</h1>
        <p>
          Configure your starting liquidity, income streams, and financial policies.
          Every step is permanently committed to your PostgreSQL database.
        </p>

        {/* Stepper Bar */}
        <div className="dash-onboarding-stepper">
          {[
            { num: 1, label: "01 / Accounts & Capital" },
            { num: 2, label: "02 / Inflows & Salary" },
            { num: 3, label: "03 / Financial Policy" },
            { num: 4, label: "04 / Budget Caps" },
            { num: 5, label: "05 / Review & Launch" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              className={`dash-onboarding-step-btn ${step === s.num ? "active" : step > s.num ? "completed" : ""}`}
              onClick={() => !busy && setStep(s.num as any)}
            >
              <span className="dash-onboarding-step-num">{s.num}</span>
              <span className="dash-onboarding-step-title">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="dash-onboarding-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* STEP 1: Accounts & Capital */}
      {step === 1 && (
        <section className="cfo-panel dash-onboarding-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>01 // Liquid Accounts & Starting Capital</strong>
            <span>STEP 1 OF 4</span>
          </div>
          <div className="dash-onboarding-body">
            <p className="dash-onboarding-hint">
              Enter your active bank accounts, savings, or cash reserves. Starting balances will form your day-one net worth foundation.
            </p>

            <div className="dash-onboarding-accounts-list">
              {accounts.map((acc, index) => (
                <div key={acc.id} className="dash-onboarding-card">
                  <div className="dash-onboarding-card-head">
                    <span className="cfo-kicker">ACCOUNT #{index + 1}</span>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        className="dash-quiet"
                        style={{ color: "var(--cfo-danger)" }}
                        onClick={() => removeAccountRow(acc.id)}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="dash-onboarding-grid">
                    <label className="cfo-field">
                      <span className="cfo-label">Account Name</span>
                      <input
                        type="text"
                        className="cfo-input"
                        placeholder="e.g. HDFC Salary Account"
                        value={acc.name}
                        onChange={(e) => updateAccountDraft(acc.id, "name", e.target.value)}
                      />
                    </label>

                    <label className="cfo-field">
                      <span className="cfo-label">Account Type</span>
                      <select
                        className="cfo-input"
                        value={acc.account_type}
                        onChange={(e) => updateAccountDraft(acc.id, "account_type", e.target.value as any)}
                      >
                        <option value="bank">Bank Checking / Salary</option>
                        <option value="savings">High-Yield Savings</option>
                        <option value="cash">Physical Cash / Wallet</option>
                        <option value="investment">Investment / Demat Cash</option>
                      </select>
                    </label>

                    <label className="cfo-field">
                      <span className="cfo-label">Starting Balance (₹)</span>
                      <input
                        type="number"
                        className="cfo-input"
                        placeholder="50000"
                        value={acc.balance}
                        onChange={(e) => updateAccountDraft(acc.id, "balance", e.target.value)}
                      />
                    </label>

                    <label className="cfo-field">
                      <span className="cfo-label">Description / Purpose</span>
                      <input
                        type="text"
                        className="cfo-input"
                        placeholder="e.g. Primary salary & daily transactions"
                        value={acc.description}
                        onChange={(e) => updateAccountDraft(acc.id, "description", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="cfo-btn cfo-btn--ghost dash-onboarding-add-btn"
              onClick={addAccountRow}
            >
              <Plus size={14} /> Add Another Account
            </button>

            <div className="dash-onboarding-footer">
              <span className="dash-onboarding-meta">
                Total Initial Liquidity: <strong>{formatINR(accounts.reduce((acc, a) => acc + (parseFloat(a.balance) || 0), 0))}</strong>
              </span>
              <button
                type="button"
                className="cfo-btn cfo-btn--fill"
                disabled={busy}
                onClick={handleProceedStep1}
              >
                {busy ? "Saving Accounts..." : "Proceed to Inflows"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 2: Income & Inflow Streams */}
      {step === 2 && (
        <section className="cfo-panel dash-onboarding-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>02 // Inflows & Primary Income Stream</strong>
            <span>STEP 2 OF 4</span>
          </div>
          <div className="dash-onboarding-body">
            <p className="dash-onboarding-hint">
              Define your monthly recurring income stream. You can choose to automatically record this month's initial deposit into your primary account.
            </p>

            <div className="dash-onboarding-card">
              <div className="dash-onboarding-grid">
                <label className="cfo-field">
                  <span className="cfo-label">Primary Income Source</span>
                  <input
                    type="text"
                    className="cfo-input"
                    placeholder="e.g. Monthly Salary / Consulting"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                  />
                </label>

                <label className="cfo-field">
                  <span className="cfo-label">Expected Monthly Inflow (₹)</span>
                  <input
                    type="number"
                    className="cfo-input"
                    placeholder="100000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginTop: "1.25rem", padding: "0.85rem", background: "color-mix(in srgb, var(--cfo-bg-elevated) 90%, var(--cfo-line))", border: "1px solid var(--cfo-line)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer", fontFamily: "var(--cfo-mono)", fontSize: "0.82rem" }}>
                  <input
                    type="checkbox"
                    checked={recordInitialIncome}
                    onChange={(e) => setRecordInitialIncome(e.target.checked)}
                    style={{ accentColor: "var(--cfo-accent)", width: "16px", height: "16px" }}
                  />
                  <span>Record opening income transaction (<strong>{formatINR(parseFloat(monthlyIncome) || 0)}</strong>) to ledger immediately</span>
                </label>
                <p style={{ margin: "0.4rem 0 0 1.65rem", fontSize: "0.75rem", color: "var(--cfo-ink-dim)" }}>
                  Ensures your ledger is immediately funded and valid for posting operating expenses.
                </p>
              </div>
            </div>

            <div className="dash-onboarding-footer">
              <button
                type="button"
                className="cfo-btn cfo-btn--ghost"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                className="cfo-btn cfo-btn--fill"
                disabled={busy}
                onClick={handleProceedStep2}
              >
                {busy ? "Saving Inflows..." : "Proceed to Financial Policy"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: Financial Policy & Risk Settings */}
      {step === 3 && (
        <section className="cfo-panel dash-onboarding-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>03 // Financial Policy & Target Cushion</strong>
            <span>STEP 3 OF 4</span>
          </div>
          <div className="dash-onboarding-body">
            <p className="dash-onboarding-hint">
              These policy targets govern your autonomous CFO Health Grade, savings alerts, and next move recommendations.
            </p>

            <div className="dash-onboarding-card">
              <div className="dash-onboarding-policy-section">
                <div>
                  <label className="cfo-label">Monthly Savings Target (%)</label>
                  <p style={{ fontSize: "0.76rem", color: "var(--cfo-ink-dim)", margin: "0.2rem 0 0.6rem" }}>
                    Percentage of gross income earmarked for wealth accumulation & debt retirement.
                  </p>
                  <div className="dash-onboarding-pills">
                    {[10, 20, 30, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className={`dash-onboarding-pill ${savingsTarget === pct ? "active" : ""}`}
                        onClick={() => setSavingsTarget(pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <label className="cfo-label">Emergency Fund Safety Cushion</label>
                  <p style={{ fontSize: "0.76rem", color: "var(--cfo-ink-dim)", margin: "0.2rem 0 0.6rem" }}>
                    Target months of non-discretionary living expenses held in liquid accounts.
                  </p>
                  <div className="dash-onboarding-pills">
                    {[3, 6, 9, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`dash-onboarding-pill ${emergencyMonths === m ? "active" : ""}`}
                        onClick={() => setEmergencyMonths(m)}
                      >
                        {m} Months
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <label className="cfo-label">Investment Risk Appetite</label>
                  <div className="dash-onboarding-pills">
                    {[
                      { id: "conservative", label: "Conservative (Capital Preservation)" },
                      { id: "moderate", label: "Moderate (Balanced Growth)" },
                      { id: "aggressive", label: "Aggressive (High Alpha)" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={`dash-onboarding-pill ${riskTolerance === r.id ? "active" : ""}`}
                        onClick={() => setRiskTolerance(r.id as any)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-onboarding-footer">
              <button
                type="button"
                className="cfo-btn cfo-btn--ghost"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                className="cfo-btn cfo-btn--fill"
                disabled={busy}
                onClick={handleProceedStep3}
              >
                {busy ? "Saving Policy..." : "Proceed to Budget Caps"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: Budget Caps */}
      {step === 4 && (
        <section className="cfo-panel dash-onboarding-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>04 // Essential Monthly Budget Caps</strong>
            <span>STEP 4 OF 4</span>
          </div>
          <div className="dash-onboarding-body">
            <p className="dash-onboarding-hint">
              Set monthly spending ceilings on key categories. The CFO engine tracks your real-time pace against these limits.
            </p>

            <div className="dash-onboarding-card">
              <div className="dash-onboarding-grid">
                {budgets.map((b) => (
                  <label key={b.category_id} className="cfo-field">
                    <span className="cfo-label">{b.category_name} Monthly Cap (₹)</span>
                    <input
                      type="number"
                      className="cfo-input"
                      value={b.limit}
                      onChange={(e) => updateBudgetLimit(b.category_id, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="dash-onboarding-footer">
              <button
                type="button"
                className="cfo-btn cfo-btn--ghost"
                onClick={() => setStep(3)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                className="cfo-btn cfo-btn--fill"
                disabled={busy}
                onClick={handleProceedStep4}
              >
                {busy ? "Saving Budgets..." : "Review & Finalize"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 5: Review & Launch */}
      {step === 5 && (
        <section className="cfo-panel dash-onboarding-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>05 // Review &amp; Workspace Launch</strong>
            <span>CONFIRMATION</span>
          </div>
          <div className="dash-onboarding-body">
            <div className="dash-onboarding-summary">
              <div className="dash-onboarding-summary-col">
                <span className="cfo-kicker">ACCOUNTS INITIALIZED</span>
                <p><strong>{accounts.length} Accounts</strong> totaling {formatINR(accounts.reduce((acc, a) => acc + (parseFloat(a.balance) || 0), 0))}</p>
              </div>

              <div className="dash-onboarding-summary-col">
                <span className="cfo-kicker">MONTHLY INFLOW</span>
                <p><strong>{formatINR(parseFloat(monthlyIncome) || 0)} / mo</strong> ({incomeSource})</p>
              </div>

              <div className="dash-onboarding-summary-col">
                <span className="cfo-kicker">POLICY SETTINGS</span>
                <p><strong>{savingsTarget}% Target</strong> · {emergencyMonths}M Cushion · {riskTolerance.toUpperCase()}</p>
              </div>

              <div className="dash-onboarding-summary-col">
                <span className="cfo-kicker">BUDGET CAPS</span>
                <p><strong>{budgets.length} Categories</strong> totaling {formatINR(budgets.reduce((acc, b) => acc + (parseFloat(b.limit) || 0), 0))} / mo</p>
              </div>
            </div>

            <div className="dash-onboarding-notice">
              <CheckCircle2 size={16} style={{ color: "var(--cfo-accent)", flexShrink: 0 }} />
              <p>
                All balances, accounts, policies, and categories are saved directly to your PostgreSQL ledger and can be adjusted or exported anytime in <strong>Settings</strong>.
              </p>
            </div>

            <div className="dash-onboarding-footer">
              <button
                type="button"
                className="cfo-btn cfo-btn--ghost"
                disabled={busy}
                onClick={() => setStep(4)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                className="cfo-btn cfo-btn--fill"
                disabled={busy}
                onClick={handleFinish}
              >
                {busy ? "Finalizing Workspace..." : "Launch CFO Workspace"} <Sparkles size={14} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
