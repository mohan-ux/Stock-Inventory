"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-y border-line bg-canvas/70 text-left text-xs font-medium text-muted">{children}</tr>
    </thead>
  );
}

export function Th({ children, className, align, ariaSort }: { children?: React.ReactNode; className?: string; align?: "right"; ariaSort?: "ascending" | "descending" | "none" }) {
  return <th aria-sort={ariaSort} className={cn("h-9 px-4 font-medium whitespace-nowrap first:pl-5 last:pr-5", align === "right" && "text-right", className)}>{children}</th>;
}

export function SortTh<K extends string>({
  k,
  sort,
  onSort,
  children,
  align,
  className,
}: {
  k: K;
  sort: { key: K; dir: 1 | -1 };
  onSort: (k: K) => void;
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  const active = sort.key === k;
  const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <Th align={align} className={className} ariaSort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink", align === "right" && "flex-row-reverse")}
      >
        {children}
        <Icon className={cn("size-3", !active && "opacity-40")} />
      </button>
    </Th>
  );
}

export function Tr({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && e.target === e.currentTarget && onClick() : undefined}
      className={cn(
        "border-b border-line/70 last:border-0",
        onClick && "cursor-pointer transition-colors outline-none hover:bg-canvas/80 focus-visible:bg-brand-50/60",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" }) {
  return <td className={cn("h-[52px] px-4 whitespace-nowrap text-ink-2 first:pl-5 last:pr-5", align === "right" && "tabular text-right", className)}>{children}</td>;
}

/** Click-to-sort for tables. `get` returns the comparable value for a key. */
export function useSort<T, K extends string>(rows: T[], get: (row: T, key: K) => string | number, initial: { key: K; dir: 1 | -1 }) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const x = get(a, sort.key);
      const y = get(b, sort.key);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return c * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `get` is a pure accessor
  }, [rows, sort]);
  const onSort = (key: K) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  return { sorted, sort, onSort };
}
