import { cn } from "@/lib/cn";

export type BarRow = { key: string; label: React.ReactNode; value: number; display: string; sub?: string; onClick?: () => void };

/** Ranked horizontal bars: label above, value at the right, one hue. */
export function BarList({ rows, className, empty = "No data for this period." }: { rows: BarRow[]; className?: string; empty?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => {
        const Row = r.onClick ? "button" : "div";
        return (
          <li key={r.key} title={r.sub}>
            <Row
              type={r.onClick ? "button" : undefined}
              onClick={r.onClick}
              className={cn("group block w-full text-left", r.onClick && "cursor-pointer")}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("min-w-0 truncate text-ink-2", r.onClick && "group-hover:text-ink")}>{r.label}</span>
                <span className="tabular shrink-0 font-medium text-ink">
                  {r.display}
                  {r.sub && <span className="ml-1.5 font-normal text-faint">{r.sub}</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500/85 transition-colors group-hover:bg-brand-600" style={{ width: `${Math.max((r.value / max) * 100, 1.5)}%` }} />
              </div>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
