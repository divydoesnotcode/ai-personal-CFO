"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format-money";
import { listTransactions, type LedgerTransaction } from "@/lib/ledger-api";

import { TransactionComposer } from "./ledger-forms";
import { Corners, EmptyBlock, ErrorBlock, Panel, Skeleton } from "./ui";

function isCredit(type: string) {
  return type === "income" || type === "refund" || type === "dividend";
}

export function TransactionsView() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransactions(100);
      setTransactions(data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load transactions"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!dialogOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  return (
    <div className="dash-content-inner">
      <div className="dash-subpage dash-subpage--wide">
        <div className="dash-page-header">
          <div>
            <p className="cfo-kicker">Ledger</p>
            <h1>Transactions</h1>
            <p>
              Posted movements feed cash flow, spending, and health. Upcoming
              (pending) items appear on the dashboard until they post.
            </p>
          </div>
          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={14} aria-hidden="true" /> Add Transaction
          </button>
        </div>

        <Panel
          title="All Transactions"
          meta={<span>{transactions.length} TOTAL</span>}
          accent
        >
          {error ? (
            <ErrorBlock message={error} onRetry={loadTransactions} />
          ) : loading ? (
            <Skeleton lines={6} />
          ) : transactions.length === 0 ? (
            <EmptyBlock
              title="No transactions yet"
              body="Add your first movement to start building your ledger."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="dash-tx-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const credit = isCredit(tx.transaction_type);
                      const amountNum = Number(tx.amount);
                      const signedVal = credit ? amountNum : -amountNum;
                      return (
                        <tr key={tx.id}>
                          <td>{formatDate(tx.transaction_date)}</td>
                          <td>{tx.description || tx.merchant_name || "—"}</td>
                          <td>{tx.category_name || "Uncategorized"}</td>
                          <td>
                            <span className="cfo-badge">
                              {tx.transaction_type.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`cfo-badge ${
                                tx.status === "posted"
                                  ? "cfo-badge--ok"
                                  : "cfo-badge--warn"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className={credit ? "dash-pos" : "dash-neg"}>
                            {formatINR(signedVal, true)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="dash-tx-cards">
                {transactions.map((tx) => {
                  const credit = isCredit(tx.transaction_type);
                  const amountNum = Number(tx.amount);
                  const signedVal = credit ? amountNum : -amountNum;
                  return (
                    <article key={tx.id} className="cfo-card dash-tx-card">
                      <div className="dash-tx-card-head">
                        <span className="dash-tx-card-date">
                          {formatDate(tx.transaction_date)}
                        </span>
                        <span
                          className={`dash-tx-card-amount ${
                            credit ? "dash-pos" : "dash-neg"
                          }`}
                        >
                          {formatINR(signedVal, true)}
                        </span>
                      </div>
                      <div className="dash-tx-card-body">
                        <strong className="dash-tx-card-desc">
                          {tx.description || tx.merchant_name || "Untitled"}
                        </strong>
                        <div className="dash-tx-card-meta">
                          <span>{tx.category_name || "Uncategorized"}</span>
                          <span className="cfo-dim">·</span>
                          <span
                            className={`cfo-badge ${
                              tx.status === "posted"
                                ? "cfo-badge--ok"
                                : "cfo-badge--warn"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
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
              aria-label="Add a transaction"
            >
              <TransactionComposer
                onSuccess={() => {
                  setDialogOpen(false);
                  loadTransactions();
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
