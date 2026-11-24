"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { fromInputDate, toInputDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** A date picked as "today" keeps the current time, so it sorts as the latest entry. */
export function dateFromInput(v: string) {
  return v === toInputDate(new Date().toISOString()) ? undefined : fromInputDate(v);
}

export function FormError({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="mt-4 flex animate-pop-in items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {error}
    </div>
  );
}

/** Two-step button for actions that change stock or money — no browser dialogs. */
export function ConfirmButton({ children, confirm, onConfirm }: { children: React.ReactNode; confirm: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant="danger"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={armed ? "bg-rose-600 text-white hover:bg-rose-700 hover:text-white" : ""}
    >
      {armed ? confirm : children}
    </Button>
  );
}
