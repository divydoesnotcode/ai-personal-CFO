"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format-money";
import { listBudgets, type LedgerBudget } from "@/lib/ledger-api";

import { BudgetComposer } from "./ledger-forms";
import { EmptyBlock, ErrorBlock, Panel, Skeleton } from "./ui";

export function BudgetsView() {
  const [budgets, setBudgets] = useState<LedgerBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBudgets();
      setBudgets(data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load budgets"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listBudgets()
      .then((data) => {
        if (cancelled) return;
        setBudgets(data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Unable to load budgets"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  return (
    <div className="dash-content-inner">
      <div className="dash-subpage dash-subpage--wide">
        <div className="dash-page-header">
          <div>
            <p className="cfo-kicker">Limits</p>
            <h1>Budgets</h1>
            <p>Set monthly ceilings by category. Overruns surface as quiet warnings on the dashboard.</p>
          </div>
          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={14} aria-hidden="true" /> Add Budget
          </button>
        </div>

        <Panel
          title="Monthly limits"
          meta={<span>{budgets.length} TOTAL</span>}
          accent
        >
          {error ? (
            <ErrorBlock message={error} onRetry={loadBudgets} />
          ) : loading ? (
            <Skeleton lines={6} />
          ) : budgets.length === 0 ? (
            <EmptyBlock
              title="No monthly limits yet"
              body="Add a category ceiling to see how the month is tracking."
            />
          ) : (
            <>
              <div className="dash-tx-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Monthly limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map((budget) => (
                      <tr key={budget.id}>
                        <td>{budget.category_name}</td>
                        <td>{formatINR(Number(budget.monthly_limit))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dash-tx-cards">
                {budgets.map((budget) => (
                  <article key={budget.id} className="cfo-card dash-tx-card">
                    <div className="dash-tx-card-head">
                      <span className="dash-tx-card-date">Monthly limit</span>
                      <span className="dash-tx-card-amount">
                        {formatINR(Number(budget.monthly_limit))}
                      </span>
                    </div>
                    <div className="dash-tx-card-body">
                      <strong className="dash-tx-card-desc">{budget.category_name}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </Panel>

        {dialogOpen ? (
          <>
            <div
              className="dash-modal-backdrop"
              onClick={() => setDialogOpen(false)}
              aria-label="Close dialog backdrop"
            />
            <div
              className="dash-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Add a budget"
            >
              <BudgetComposer
                onSuccess={() => {
                  setDialogOpen(false);
                  loadBudgets();
                }}
                onCancel={() => setDialogOpen(false)}
                redirectToDashboard={false}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
