import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line/80 bg-surface shadow-card", className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-line bg-canvas text-muted [&_svg]:size-5">{icon}</div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-xs text-[13px] text-muted">{children}</div>}
    </div>
  );
}

/** Signed change vs. a previous period. `goodWhenUp` picks the colour direction. */
export function Delta({ value, goodWhenUp = true }: { value: number; goodWhenUp?: boolean }) {
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      <Icon className="size-3.5" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/** A headline number. Values are tabular so rows of tiles align. */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
  href,
  delta,
  chart,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "warn";
  href?: string;
  delta?: React.ReactNode;
  chart?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-4",
              tone === "warn" ? "bg-amber-50 text-amber-600 ring-amber-200/60" : "bg-brand-50 text-brand-600 ring-brand-100",
            )}
          >
            {icon}
          </span>
        )}
        <p className="text-[13px] font-medium text-muted">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink">{value}</p>
            {delta}
          </div>
          {hint && <div className="mt-2.5 text-[13px] text-muted">{hint}</div>}
        </div>
        {chart && <div className="h-10 w-24 shrink-0">{chart}</div>}
      </div>
    </>
  );
  const cls = "group relative block overflow-hidden rounded-2xl border border-line/80 bg-surface p-5 shadow-card";
  return href ? (
    <Link href={href} className={cn(cls, "transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Stock level vs. minimum. The marker shows where the minimum sits. */
export function LevelMeter({ qty, min, className }: { qty: number; min: number; className?: string }) {
  const max = Math.max(min * 3, qty, 1);
  const pct = Math.min(100, (qty / max) * 100);
  const minPct = Math.min(100, (min / max) * 100);
  const color = qty <= 0 ? "bg-rose-500" : qty <= min ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={cn("relative h-1.5 w-full rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(pct, qty > 0 ? 3 : 0)}%` }} />
      <div className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-ink/30" style={{ left: `${minPct}%` }} title={`Minimum ${min}`} />
    </div>
  );
}
