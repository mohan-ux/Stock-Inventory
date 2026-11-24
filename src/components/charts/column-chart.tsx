"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type Point = { label: string; value: number; sub?: string };

/**
 * Single-series column chart. Thin columns with a rounded data end, a quiet
 * grid, and a hover tooltip (the hit area is the full band, not just the bar).
 */
export function ColumnChart({
  data,
  format,
  height = 220,
  labelEvery = 1,
  className,
}: {
  data: Point[];
  format: (n: number) => string;
  height?: number;
  labelEvery?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const n = data.length;

  return (
    <div className={cn("relative select-none", className)} onMouseLeave={() => setHover(null)}>
      <div className="flex" style={{ height }}>
        {/* y axis */}
        <div className="relative w-12 shrink-0">
          {ticks.map((t) => (
            <span key={t} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-faint" style={{ top: `${100 - (t / max) * 100}%` }}>
              {format(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ top: `${100 - (t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div
                key={i}
                className="relative flex flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${d.label}: ${format(d.value)}`}
              >
                {hover === i && <div className="absolute inset-y-0 inset-x-px rounded bg-ink/[0.035]" />}
                <div
                  className={cn("relative w-[62%] max-w-6 rounded-t-[4px] transition-colors", hover === i ? "bg-brand-600" : "bg-brand-500/85")}
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-pop"
              style={{
                left: `${((hover + 0.5) / n) * 100}%`,
                bottom: `calc(${(data[hover].value / max) * 100}% + 8px)`,
                transform: `translateX(${hover < n * 0.15 ? "-15%" : hover > n * 0.85 ? "-85%" : "-50%"})`,
              }}
            >
              <p className="text-[11px] whitespace-nowrap text-muted">{data[hover].label}</p>
              <p className="tabular text-sm font-semibold whitespace-nowrap text-ink">{format(data[hover].value)}</p>
              {data[hover].sub && <p className="text-[11px] whitespace-nowrap text-muted">{data[hover].sub}</p>}
            </div>
          )}
        </div>
      </div>
      {/* x axis */}
      <div className="mt-2 flex pl-12">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[11px] whitespace-nowrap text-faint">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return step * p;
}
