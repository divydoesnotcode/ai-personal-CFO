"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";

import { useAskCfo } from "@/lib/dashboard/ask-cfo";
import { Corners } from "./ui";

const PROMPTS = [
  "Can I afford a ₹20,000 purchase?",
  "Why did I overspend this month?",
  "How can I save ₹10,000 more?",
];

type LogItem = { role: "you" | "cfo"; text: string };

export function AskCfoPanel() {
  const { open, draft, setDraft, openPanel, closePanel } = useAskCfo();
  const reduced = useReducedMotion();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<LogItem[]>([]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePanel, open]);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    setLog((current) => [
      ...current,
      { role: "you", text: question },
      {
        role: "cfo",
        text: "Noted against your current picture. The conversational agent is not connected yet, so I will not invent a figure. Use the insights and next moves on the dashboard until the agent is live.",
      },
    ]);
    setDraft("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <>
      <button
        type="button"
        className="cfo-btn cfo-btn--ghost dash-ask-btn"
        onClick={() => openPanel()}
      >
        <Sparkles size={14} aria-hidden="true" />
        Ask your CFO
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              className="dash-ask-backdrop"
              aria-label="Close AI CFO"
              onClick={closePanel}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
            />
            <motion.div
              className="cfo-panel dash-ask"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${inputId}-title`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <Corners accent />
              <div className="cfo-panel-head">
                <strong id={`${inputId}-title`}>AI CFO</strong>
                <button
                  type="button"
                  className="dash-icon-btn"
                  aria-label="Close"
                  onClick={closePanel}
                >
                  <X size={14} />
                </button>
              </div>
              <p>What would you like to know?</p>
              {log.length > 0 ? (
                <div className="dash-ask-log" aria-live="polite">
                  {log.map((item, index) => (
                    <p key={`${item.role}-${index}`}>
                      <strong>{item.role === "you" ? "You" : "CFO"}</strong>
                      {item.text}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="dash-prompts">
                {PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => ask(prompt)}>
                    “{prompt}”
                  </button>
                ))}
              </div>
              <form className="dash-ask-form" onSubmit={onSubmit}>
                <input
                  ref={inputRef}
                  id={inputId}
                  className="cfo-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask anything…"
                  aria-label="Ask your CFO"
                />
                <button
                  type="submit"
                  className="cfo-btn cfo-btn--fill"
                  aria-label="Send"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
