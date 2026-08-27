"use client";

/**
 * CfoReveal — auth-page entrance animation component.
 *
 * Wraps any auth shell element with the EXACT same reveal mechanism used
 * on the landing page: `.cfo-reveal` starts invisible (opacity: 0,
 * translateY 24px) and transitions to fully visible once the element
 * enters the viewport, via the `cfo-visible` class.
 *
 * Implementation is intentionally thin — it delegates entirely to
 * `useReveal` from lib/use-reveal.ts (the same hook used by page.tsx)
 * and the shared `.cfo-reveal` / `.cfo-visible` CSS in globals.css.
 *
 * Usage in auth-shell.tsx:
 *   <CfoReveal className="auth-copy">…</CfoReveal>
 *   <CfoReveal className="auth-panel" delay={120}>…</CfoReveal>
 *
 * The `className` is forwarded directly onto the wrapper div, so
 * auth-specific grid-child styles (auth-copy, auth-panel) continue to
 * apply without any layout change.
 */

import { useReveal } from "@/lib/use-reveal";

interface CfoRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Milliseconds to wait after the element enters the viewport before revealing. */
  delay?: number;
}

export function CfoReveal({
  children,
  delay = 0,
  className = "",
  ...props
}: CfoRevealProps) {
  // useReveal with threshold=0.05 so auth elements (fully visible on load)
  // trigger immediately, giving a clean page-load entrance animation.
  const ref = useReveal(0.05, delay);

  return (
    <div ref={ref} className={`cfo-reveal ${className}`} {...props}>
      {children}
    </div>
  );
}
