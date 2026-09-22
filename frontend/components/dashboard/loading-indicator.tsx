"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const LOADER_DELAY = 120;

/**
 * A delayed, non-blocking loading cue for shell-level work. The delay keeps
 * cached and fast responses from briefly flashing a progress indicator.
 */
export function LoadingIndicator({
  active,
  label = "Updating your ledger",
}: {
  active: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setVisible(active),
      active ? LOADER_DELAY : 0,
    );
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="dash-loading"
          role="status"
          aria-live="polite"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.14 }}
        >
          <span className="dash-loading-label">{label}</span>
          <span className="dash-loading-track" aria-hidden="true">
            <span className="dash-loading-bar" />
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
