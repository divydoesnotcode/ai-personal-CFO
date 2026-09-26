"use client";

import type { MouseEvent, ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Corners } from "./ui";

type EditDeleteActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  /** icon: compact row controls. labeled: text buttons for dialogs. */
  variant?: "icon" | "labeled";
  className?: string;
};

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

export function EditDeleteActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  variant = "icon",
  className = "dash-row-actions",
}: EditDeleteActionsProps) {
  if (variant === "labeled") {
    return (
      <>
        <button
          type="button"
          className="cfo-btn cfo-btn--ghost"
          aria-label={editLabel}
          onClick={onEdit}
        >
          <Pencil size={13} aria-hidden="true" /> Edit
        </button>
        <button
          type="button"
          className="cfo-btn cfo-btn--danger"
          aria-label={deleteLabel}
          onClick={onDelete}
        >
          <Trash2 size={13} aria-hidden="true" /> Delete
        </button>
      </>
    );
  }

  return (
    <div className={className} onClick={stopRowClick}>
      <button
        type="button"
        className="dash-icon-btn"
        title={editLabel}
        aria-label={editLabel}
        onClick={(event) => {
          stopRowClick(event);
          onEdit();
        }}
      >
        <Pencil size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="dash-icon-btn dash-icon-btn--danger"
        title={deleteLabel}
        aria-label={deleteLabel}
        onClick={(event) => {
          stopRowClick(event);
          onDelete();
        }}
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

export function DeleteConfirmDialog({
  titleId,
  title,
  description,
  busy,
  onCancel,
  onConfirm,
}: {
  titleId: string;
  title: string;
  description: ReactNode;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div
        className="dash-modal-backdrop"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-label="Close delete dialog backdrop"
      />
      <div
        className="cfo-panel dash-modal dash-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-desc`}
      >
        <Corners accent />
        <div className="cfo-panel-head">
          <strong id={titleId}>{title}</strong>
          <button
            type="button"
            className="dash-icon-btn"
            aria-label="Close dialog"
            onClick={onCancel}
            disabled={busy}
          >
            ✕
          </button>
        </div>
        <p id={`${titleId}-desc`}>{description}</p>
        <div className="dash-modal-actions">
          <button
            type="button"
            className="cfo-btn cfo-btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cfo-btn cfo-btn--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </>
  );
}
