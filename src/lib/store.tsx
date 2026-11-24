"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apply, InventoryError, type Action } from "./inventory";
import { buildSeed } from "./seed";
import type { State } from "./types";

const STORAGE_KEY = "stockwise:v2";

type Result = { ok: true; state: State } | { ok: false; error: string };

interface StoreValue {
  state: State;
  /** A clock for "overdue" / "x ago" logic: set on load, each action, and every minute. */
  now: number;
  dispatch: (action: Action) => Result;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage unavailable or corrupted — fall back to the seed */
  }
  return buildSeed();
}

export function StoreProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [now, setNow] = useState(0);
  const ref = useRef<State | null>(null);

  // Load on the client only: sample data is relative to "today" and may be
  // overridden by what this browser saved earlier.
  useEffect(() => {
    const s = load();
    ref.current = s;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setState(s);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [state]);

  const dispatch = useCallback((action: Action): Result => {
    if (!ref.current) return { ok: false, error: "Still loading" };
    try {
      const next = apply(ref.current, action);
      ref.current = next;
      setState(next);
      setNow(Date.now());
      return { ok: true, state: next };
    } catch (e) {
      if (e instanceof InventoryError) return { ok: false, error: e.message };
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    const s = buildSeed();
    ref.current = s;
    setState(s);
    setNow(Date.now());
  }, []);

  // `state` is only null before the first client effect; children never see that.
  const value = useMemo(() => ({ state: state as State, now, dispatch, reset }), [state, now, dispatch, reset]);
  if (!state) return <>{fallback}</>;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Convenience lookups shared by many screens. */
export function useLookups() {
  const { state } = useStore();
  return useMemo(() => {
    const item = new Map(state.items.map((i) => [i.id, i]));
    const customer = new Map(state.customers.map((c) => [c.id, c]));
    const supplier = new Map(state.suppliers.map((s) => [s.id, s]));
    return { item, customer, supplier };
  }, [state.items, state.customers, state.suppliers]);
}
