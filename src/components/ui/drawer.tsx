"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { IconButton } from "./button";

/**
 * Side panel used for every record and form. Records open beside the list, so
 * the user never loses their place (search, filters, scroll).
 */
export function Drawer({
  open,
  onClose,
  onBack,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="drawer-root fixed inset-0 z-50">
      <div className="drawer-backdrop absolute inset-0 animate-fade-in bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[580px] animate-slide-in flex-col overflow-hidden bg-surface shadow-[0_0_0_1px_rgb(16_24_40/0.06),-24px_0_60px_-12px_rgb(16_24_40/0.25)] outline-none sm:rounded-l-2xl"
      >
        <div className="no-print absolute top-3.5 right-3.5 z-10 flex gap-1">
          {onBack && (
            <IconButton label="Back" onClick={onBack}>
              <ArrowLeft />
            </IconButton>
          )}
          <IconButton label="Close" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Standard drawer layout: header, scrollable body, sticky footer. */
export function DrawerLayout({
  eyebrow,
  title,
  meta,
  icon,
  children,
  footer,
}: {
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-start gap-4 border-b border-line bg-gradient-to-b from-canvas/80 to-surface px-6 pt-6 pb-5 pr-24">
        {icon}
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{eyebrow}</div>}
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">{meta}</div>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/60 px-6 py-3.5">{footer}</div>}
    </>
  );
}

const iconTones = {
  brand: "from-brand-500 to-brand-700 shadow-[0_6px_16px_-6px_rgb(79_70_229/0.6)]",
  sky: "from-sky-500 to-indigo-600 shadow-[0_6px_16px_-6px_rgb(14_165_233/0.55)]",
  amber: "from-amber-400 to-orange-500 shadow-[0_6px_16px_-6px_rgb(245_158_11/0.55)]",
  emerald: "from-emerald-400 to-teal-600 shadow-[0_6px_16px_-6px_rgb(16_185_129/0.5)]",
};

/** The gradient tile shown at the left of a drawer header. */
export function DrawerIcon({ icon: Icon, tone = "brand" }: { icon: React.ElementType; tone?: keyof typeof iconTones }) {
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${iconTones[tone]}`}>
      <Icon className="size-5" />
    </span>
  );
}

/** Print just the open drawer (see `.print-dialog` in globals.css). */
export function printDrawer() {
  document.body.classList.add("print-dialog");
  window.addEventListener("afterprint", () => document.body.classList.remove("print-dialog"), { once: true });
  window.print();
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DL({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="mt-0.5 truncate text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
