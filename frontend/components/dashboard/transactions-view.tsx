"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format-money";
import {
  deleteTransaction,
  getTransaction,
  listTransactions,
  type LedgerTransaction,
} from "@/lib/ledger-api";

import { TransactionComposer } from "./ledger-forms";
import { DeleteConfirmDialog, EditDeleteActions } from "./row-actions";
import { Corners, EmptyBlock, ErrorBlock, Panel, Skeleton } from "./ui";

function isCredit(type: string) {
  return type === "income" || type === "refund" || type === "dividend";
}

export function TransactionsView() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<LedgerTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<LedgerTransaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
    if (!dialogOpen && !deletingTransaction && !viewingTransaction) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deletingTransaction && !deleteBusy) {
          setDeletingTransaction(null);
        } else if (viewingTransaction) {
          setViewingTransaction(null);
        } else if (dialogOpen) {
          setDialogOpen(false);
          setEditingTransaction(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, deletingTransaction, viewingTransaction, deleteBusy]);

  const handleRowClick = async (tx: LedgerTransaction) => {
    setViewingTransaction(tx);
    try {
      const freshData = await getTransaction(tx.id);
      if (freshData) {
        setViewingTransaction(freshData);
      }
    } catch {
      // Keep existing row data if getTransaction fails
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    setDeleteBusy(true);
    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
      loadTransactions();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to delete transaction"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="dash-content-inner">
      <div className="dash-subpage dash-subpage--full" style={{ maxWidth: "100%", width: "100%" }}>
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
            onClick={() => {
              setEditingTransaction(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={14} aria-hidden="true" /> Add Transaction
          </button>
        </div>

        <Panel
          title="All Transactions"
          meta={<span>{transactions.length} TOTAL</span>}
          accent
          className="w-full"
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
              <div className="dash-tx-table-wrap" style={{ width: "100%", maxWidth: "100%" }}>
                <table className="dash-table" style={{ width: "100%", maxWidth: "100%" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Account</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="dash-tx-amount" style={{ textAlign: "right" }}>
                        Amount
                      </th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const credit = isCredit(tx.transaction_type);
                      const amountNum = Number(tx.amount);
                      const signedVal = credit ? amountNum : -amountNum;
                      return (
                        <tr
                          key={tx.id}
                          className="dash-tx-row"
                          onClick={() => handleRowClick(tx)}
                        >
                          <td>{formatDate(tx.transaction_date)}</td>
                          <td title={tx.description || tx.merchant_name || undefined}>
                            {tx.description || tx.merchant_name || "—"}
                          </td>
                          <td>{tx.account_name || "Cash"}</td>
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
                          <td
                            className={`dash-tx-amount ${
                              credit ? "dash-pos" : "dash-neg"
                            }`}
                            style={{ textAlign: "right" }}
                          >
                            {formatINR(signedVal, true)}
                          </td>
                          <td>
                            <EditDeleteActions
                              className="dash-tx-actions"
                              editLabel="Edit transaction"
                              deleteLabel="Delete transaction"
                              onEdit={() => {
                                setEditingTransaction(tx);
                                setDialogOpen(true);
                              }}
                              onDelete={() => setDeletingTransaction(tx)}
                            />
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
                    <article
                      key={tx.id}
                      className="cfo-card dash-tx-card dash-tx-card--clickable"
                      onClick={() => handleRowClick(tx)}
                    >
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
                          <span>{tx.account_name || "Cash"}</span>
                          <span className="cfo-dim">·</span>
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
                      <div className="dash-tx-card-footer">
                        <span className="cfo-badge">
                          {tx.transaction_type.replaceAll("_", " ")}
                        </span>
                        <EditDeleteActions
                          className="dash-tx-card-actions"
                          editLabel="Edit transaction"
                          deleteLabel="Delete transaction"
                          onEdit={() => {
                            setEditingTransaction(tx);
                            setDialogOpen(true);
                          }}
                          onDelete={() => setDeletingTransaction(tx)}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </Panel>

        {/* Transaction Details Modal */}
        {viewingTransaction ? (
          <>
            <div
              className="dash-modal-backdrop"
              onClick={() => setViewingTransaction(null)}
              aria-label="Close transaction details backdrop"
            />
            <div
              className="cfo-panel dash-modal dash-details-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tx-details-title"
            >
              <Corners accent />
              <div className="cfo-panel-head">
                <strong id="tx-details-title">Transaction Details</strong>
                <button
                  type="button"
                  className="dash-icon-btn"
                  aria-label="Close dialog"
                  onClick={() => setViewingTransaction(null)}
                >
                  ✕
                </button>
              </div>

              {/* Hero Amount & Badges */}
              <div className="dash-details-hero">
                <div
                  className={`dash-details-amount ${
                    isCredit(viewingTransaction.transaction_type)
                      ? "dash-pos"
                      : "dash-neg"
                  }`}
                >
                  {formatINR(
                    isCredit(viewingTransaction.transaction_type)
                      ? Number(viewingTransaction.amount)
                      : -Number(viewingTransaction.amount),
                    true
                  )}
                </div>
                <div className="dash-details-badges">
                  <span className="cfo-badge">
                    {viewingTransaction.transaction_type.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`cfo-badge ${
                      viewingTransaction.status === "posted"
                        ? "cfo-badge--ok"
                        : "cfo-badge--warn"
                    }`}
                  >
                    {viewingTransaction.status}
                  </span>
                  {viewingTransaction.currency ? (
                    <span className="cfo-badge cfo-dim">
                      {viewingTransaction.currency}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Details Grid */}
              <div className="dash-details-grid">
                <div className="dash-details-item dash-details-item--full">
                  <span className="dash-details-label">Description / Merchant</span>
                  <strong className="dash-details-val">
                    {viewingTransaction.description ||
                      viewingTransaction.merchant_name ||
                      "—"}
                  </strong>
                </div>

                <div className="dash-details-item">
                  <span className="dash-details-label">Date & Time</span>
                  <span className="dash-details-val">
                    {new Date(viewingTransaction.transaction_date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div className="dash-details-item">
                  <span className="dash-details-label">Account</span>
                  <span className="dash-details-val">
                    {viewingTransaction.account_name || "Cash"}
                  </span>
                </div>

                <div className="dash-details-item">
                  <span className="dash-details-label">Category</span>
                  <span className="dash-details-val">
                    {viewingTransaction.category_name || "Uncategorized"}
                  </span>
                </div>

                <div className="dash-details-item">
                  <span className="dash-details-label">Status</span>
                  <span className="dash-details-val" style={{ textTransform: "capitalize" }}>
                    {viewingTransaction.status}
                  </span>
                </div>

                <div className="dash-details-item dash-details-item--full">
                  <span className="dash-details-label">Transaction ID</span>
                  <span className="dash-details-val cfo-mono" style={{ fontSize: "0.75rem" }}>
                    {viewingTransaction.id}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="dash-modal-actions" style={{ marginTop: "1.5rem" }}>
                <EditDeleteActions
                  variant="labeled"
                  editLabel="Edit transaction"
                  deleteLabel="Delete transaction"
                  onEdit={() => {
                    const tx = viewingTransaction;
                    setViewingTransaction(null);
                    setEditingTransaction(tx);
                    setDialogOpen(true);
                  }}
                  onDelete={() => {
                    const tx = viewingTransaction;
                    setViewingTransaction(null);
                    setDeletingTransaction(tx);
                  }}
                />
                <button
                  type="button"
                  className="cfo-btn cfo-btn--ghost"
                  onClick={() => setViewingTransaction(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* Edit / Add Modal */}
        {dialogOpen ? (
          <>
            <div
              className="dash-modal-backdrop"
              onClick={() => {
                setDialogOpen(false);
                setEditingTransaction(null);
              }}
              aria-label="Close dialog backdrop"
            />
            <div
              className="dash-modal"
              role="dialog"
              aria-modal="true"
              aria-label={editingTransaction ? "Edit transaction" : "Add a transaction"}
            >
              <TransactionComposer
                key={editingTransaction ? editingTransaction.id : "new"}
                transaction={editingTransaction}
                onSuccess={() => {
                  setDialogOpen(false);
                  setEditingTransaction(null);
                  loadTransactions();
                }}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditingTransaction(null);
                }}
                redirectToDashboard={false}
              />
            </div>
          </>
        ) : null}

        {deletingTransaction ? (
          <DeleteConfirmDialog
            titleId="delete-dialog-title"
            title="Delete transaction"
            busy={deleteBusy}
            onCancel={() => setDeletingTransaction(null)}
            onConfirm={handleDeleteConfirm}
            description={
              <>
                Are you sure you want to delete this transaction{" "}
                <strong>
                  &ldquo;{deletingTransaction.description || deletingTransaction.merchant_name || "Untitled"}&rdquo; (
                  {formatINR(Number(deletingTransaction.amount))})
                </strong>
                ? This will update your account balance and cannot be undone.
              </>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
