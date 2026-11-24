import { cn } from "@/lib/cn";
import type { PurchaseDisplayStatus, SaleDisplayStatus } from "@/lib/inventory";
import type { StockStatus } from "@/lib/types";

export type Tone = "green" | "amber" | "red" | "blue" | "gray" | "violet";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 [--dot:var(--color-emerald-500)]",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20 [--dot:var(--color-amber-500)]",
  red: "bg-rose-50 text-rose-700 ring-rose-600/15 [--dot:var(--color-rose-500)]",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15 [--dot:var(--color-sky-500)]",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/15 [--dot:var(--color-slate-400)]",
  violet: "bg-brand-50 text-brand-700 ring-brand-600/15 [--dot:var(--color-brand-500)]",
};

export function Badge({ tone = "gray", dot = true, children, className }: { tone?: Tone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-(--dot)" />}
      {children}
    </span>
  );
}

const statusTone: Record<StockStatus | SaleDisplayStatus | PurchaseDisplayStatus, Tone> = {
  "In stock": "green",
  "Low stock": "amber",
  "Out of stock": "red",
  Paid: "green",
  Unpaid: "blue",
  Overdue: "red",
  Cancelled: "gray",
  Received: "green",
  Pending: "amber",
  Late: "red",
};

export function StatusBadge({ status }: { status: keyof typeof statusTone }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>;
}
