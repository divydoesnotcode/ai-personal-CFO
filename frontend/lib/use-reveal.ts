/**
 * Shared scroll-reveal hooks for the CFO design system.
 *
 * These are the canonical implementations used by BOTH the landing page
 * and the auth pages. Importing from here guarantees identical animation
 * behaviour (timing, easing, direction) across the entire frontend.
 *
 * CSS counterpart: .cfo-reveal / .cfo-visible in app/globals.css
 *   opacity: 0 → 1
 *   transform: translateY(24px) → translateY(0)
 *   transition: 0.65s ease
 */

"use client";

import { useEffect, useRef } from "react";

// ── Single-element reveal ────────────────────────────────────────────────────
/**
 * Attaches an IntersectionObserver to a div ref.
 * Adds `cfo-visible` as soon as the element enters the viewport,
 * which triggers the CSS transition defined on `.cfo-reveal`.
 *
 * The dependency array is always [threshold, delay] (fixed length = 2)
 * regardless of which arguments the caller passes — both have defaults.
 *
 * @param threshold  Fraction of the element that must be visible (default 0.12)
 * @param delay      Optional ms to wait after intersection before revealing (default 0)
 */
export function useReveal(threshold = 0.12, delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  // Store mutable copies so the effect doesn't re-run on every render
  // while still reading the latest values.
  const thresholdRef = useRef(threshold);
  const delayRef = useRef(delay);
  thresholdRef.current = threshold;
  delayRef.current = delay;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(
            () => el.classList.add("cfo-visible"),
            delayRef.current,
          );
          obs.disconnect();
        }
      },
      { threshold: thresholdRef.current },
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty: observer is set up once on mount; mutable refs carry latest values

  return ref;
}

// ── Staggered multi-element reveal ───────────────────────────────────────────
/**
 * Watches an array of sibling elements and reveals them in sequence,
 * each `itemDelay` ms after the previous, once any one of them enters
 * the viewport.
 *
 * Usage:
 *   const refs = useStagger(items.length, 80);
 *   items.map((item, i) => (
 *     <div ref={(el) => { refs.current[i] = el; }} className="cfo-reveal">
 *       ...
 *     </div>
 *   ))
 */
export function useStagger(count: number, itemDelay = 80) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const itemDelayRef = useRef(itemDelay);
  itemDelayRef.current = itemDelay;

  useEffect(() => {
    const elements = refs.current.filter(Boolean) as HTMLDivElement[];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observers: IntersectionObserver[] = [];

    elements.forEach((el, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const t = setTimeout(
              () => el.classList.add("cfo-visible"),
              i * itemDelayRef.current,
            );
            timers.push(t);
            obs.disconnect();
          }
        },
        { threshold: 0.08 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]); // re-run only if the number of observed elements changes

  return refs;
}
