"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AskCfoContextValue = {
  open: boolean;
  draft: string;
  openPanel: (prompt?: string) => void;
  closePanel: () => void;
  setDraft: (value: string) => void;
};

const AskCfoContext = createContext<AskCfoContextValue | null>(null);

export function AskCfoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const openPanel = useCallback((prompt?: string) => {
    if (prompt) setDraft(prompt);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ open, draft, openPanel, closePanel, setDraft }),
    [closePanel, draft, open, openPanel],
  );

  return (
    <AskCfoContext.Provider value={value}>{children}</AskCfoContext.Provider>
  );
}

export function useAskCfo() {
  const context = useContext(AskCfoContext);
  if (!context) {
    throw new Error("useAskCfo must be used within AskCfoProvider");
  }
  return context;
}
