import { cn } from "@/lib/cn";

const dot = { green: "bg-emerald-500", blue: "bg-sky-500", red: "bg-rose-500", amber: "bg-amber-500" } as const;

/** A compact row of figures above a list, summarising the current period. */
export function SummaryStrip({ items }: { items: { label: string; value: string; hint?: string; tone?: keyof typeof dot }[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-card lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={it.label} className={cn("px-4 py-4 sm:px-5", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line lg:border-t-0", i === 2 && "lg:border-l")}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            {it.tone && <span className={cn("size-1.5 rounded-full", dot[it.tone])} />}
            {it.label}
          </p>
          <p className="tabular mt-1.5 text-xl font-semibold tracking-[-0.01em] text-ink">{it.value}</p>
          {it.hint && <p className="text-xs text-faint">{it.hint}</p>}
        </div>
      ))}
    </div>
  );
}
