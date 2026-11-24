"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; title: string; description?: string; tone?: "success" | "error"; action?: { label: string; href: string } };
type ToastFn = (t: Omit<Toast, "id">) => void;

const ToastContext = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastContext);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback<ToastFn>(
    (t) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[70] lg:left-[264px] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.tone === "error" ? AlertCircle : CheckCircle2;
          return (
            <div key={t.id} className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
              <Icon className={cn("mt-0.5 size-[18px] shrink-0", t.tone === "error" ? "text-rose-500" : "text-emerald-500")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
                {t.action && (
                  <Link href={t.action.href} onClick={() => dismiss(t.id)} className="mt-1.5 inline-block text-[13px] font-medium text-brand-600 hover:text-brand-700">
                    {t.action.label} →
                  </Link>
                )}
              </div>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-faint hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
