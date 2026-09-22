"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { formatINR, formatPercent } from "@/lib/format-money";

export function Corners({ accent = false }: { accent?: boolean }) {
  return (
    <>
      <span
        className={`cfo-corner cfo-corner--tl${accent ? " cfo-corner--accent" : ""}`}
        aria-hidden="true"
      />
      <span className="cfo-corner cfo-corner--tr" aria-hidden="true" />
      <span className="cfo-corner cfo-corner--bl" aria-hidden="true" />
      <span
        className={`cfo-corner cfo-corner--br${accent ? " cfo-corner--accent" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
  accent = false,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: boolean;
  actions?: ReactNode;
}) {
  return (
    <section className={`cfo-panel dash-panel ${className}`.trim()}>
      <Corners accent={accent} />
      <div className="cfo-panel-head">
        <strong>{title}</strong>
        {actions ?? (meta ? <span>{meta}</span> : null)}
      </div>
      {children}
    </section>
  );
}

export const Delta = memo(function Delta({
  pct,
  label,
  invert = false,
}: {
  pct: number;
  label: string;
  invert?: boolean;
}) {
  const positive = invert ? pct < 0 : pct > 0;
  const negative = invert ? pct > 0 : pct < 0;
  const tone = positive ? "up" : negative ? "down" : "flat";
  const Icon = pct < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <p className={`dash-delta${tone === "flat" ? "" : ` dash-delta--${tone}`}`}>
      <Icon size={12} aria-hidden="true" />
      <b>{formatPercent(pct, 1, true)}</b>
      <span>{label}</span>
    </p>
  );
});

export function Progress({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: "accent" | "ok" | "warn" | "danger";
}) {
  const width = Math.max(0, Math.min(100, value));
  const cls =
    tone === "ok"
      ? "dash-bar dash-bar--ok"
      : tone === "warn"
        ? "dash-bar dash-bar--warn"
        : tone === "danger"
          ? "dash-bar dash-bar--danger"
          : "dash-bar";

  return (
    <span className={cls} aria-hidden="true">
      <i style={{ width: `${width}%` }} />
    </span>
  );
}

export function Money({
  amount,
  signed = false,
}: {
  amount: number;
  signed?: boolean;
}) {
  const text = formatINR(amount, signed);
  const cls = signed ? (amount >= 0 ? "dash-pos" : "dash-neg") : undefined;
  return <span className={cls}>{text}</span>;
}

export function Skeleton({ lines = 3, value = false }: { lines?: number; value?: boolean }) {
  return (
    <div
      className={`dash-skel${value ? " dash-skel--value" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}

export function EmptyBlock({
  title,
  body,
  action,
  href,
}: {
  title: string;
  body: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="dash-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action && href ? (
        <Link href={href} className="cfo-btn cfo-btn--ghost">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="dash-error">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="dash-quiet" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function QuietLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="dash-quiet">
      {children}
    </Link>
  );
}

export function statusLabel(status: string): string {
  if (status === "needs_attention") return "Needs Attention";
  return status.replaceAll("_", " ");
}
