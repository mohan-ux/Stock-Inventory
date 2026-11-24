import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink shadow-card outline-none transition-[border,box-shadow] placeholder:text-faint hover:border-line-strong focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-canvas disabled:text-muted";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "w-full", className)} {...rest} />;
}

/** `inline` sizes the select to its content (filter bars); otherwise it fills its field. */
export function Select({ className, children, inline, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { inline?: boolean }) {
  return (
    <select
      className={cn(
        control,
        inline ? "w-auto" : "w-full",
        "cursor-pointer appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b7489' stroke-width='1.6' viewBox='0 0 24 24'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E\")] bg-[right_0.5rem_center] bg-no-repeat pr-8",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "w-full h-auto min-h-20 py-2", className)} {...rest} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(control, "w-full pr-8 pl-9")}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-faint hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Filter tabs with optional counts — the main filter on list screens. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full overflow-x-auto rounded-lg bg-ink/[0.045] p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              active ? "bg-surface text-ink shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_1px_rgb(16_24_40/0.04)]" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("tabular rounded px-1 text-[11px]", active ? "bg-ink/[0.06] text-ink-2" : "text-faint")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
