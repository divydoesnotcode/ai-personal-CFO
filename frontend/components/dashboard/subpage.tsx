"use client";

import Link from "next/link";

import { Corners } from "./ui";

export function LedgerSubpage({
  kicker,
  title,
  body,
  href = "/dashboard",
  action = "Return to dashboard",
}: {
  kicker: string;
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="dash-content-inner">
      <div className="dash-subpage">
        <p className="cfo-kicker">{kicker}</p>
        <section className="cfo-panel dash-panel">
          <Corners accent />
          <div className="cfo-panel-head">
            <strong>{title}</strong>
            <span>VIEW</span>
          </div>
          <p>{body}</p>
          <div className="dash-cta-row">
            <Link href={href} className="dash-quiet">
              {action}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
