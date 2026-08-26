import type { ReactNode } from "react";

type AuthShellProps = {
  kicker: string;
  figure: string;
  title: [string, string];
  lede: string;
  children: ReactNode;
};

export function AuthShell({
  kicker,
  figure,
  title,
  lede,
  children,
}: AuthShellProps) {
  return (
    <>
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-guide auth-guide--v" aria-hidden="true" />
      <div className="auth-guide auth-guide--h" aria-hidden="true" />

      <header className="auth-top">
        <p className="auth-brand">
          CFO <span>{"//"}</span> AUTH
        </p>
        <p className="auth-meta">
          <span>
            <span className="auth-pulse" aria-hidden="true" />
            SYS.READY
          </span>
          <span>
            NODE <b>01</b>
          </span>
          <span>LEDGER / INR</span>
        </p>
      </header>

      <main className="auth-stage">
        <section className="auth-copy">
          <p className="auth-kicker">{kicker}</p>
          <h1 className="auth-title">
            {title[0]}
            <br />
            {title[1]}
          </h1>
          <p className="auth-lede">{lede}</p>
          <p className="auth-coords">
            19.0760° N · 72.8777° E
            <br />
            REF. PERSONAL-CFO / 0.1.0
          </p>
        </section>

        <section className="auth-panel" aria-labelledby="auth-panel-title">
          <span className="auth-corner auth-corner--tl" aria-hidden="true" />
          <span className="auth-corner auth-corner--tr" aria-hidden="true" />
          <span className="auth-corner auth-corner--bl" aria-hidden="true" />
          <span className="auth-corner auth-corner--br" aria-hidden="true" />

          <div className="auth-panel-head">
            <strong id="auth-panel-title">{figure}</strong>
            <span>FORM / LOCAL</span>
          </div>

          {children}
        </section>
      </main>

      <footer className="auth-foot">
        <span>AUTH.SERVICE · UNPROVISIONED</span>
        <span className="auth-foot-hide-wide">CHANNEL · HTTPS</span>
        <span>v0.1.0</span>
      </footer>
    </>
  );
}
