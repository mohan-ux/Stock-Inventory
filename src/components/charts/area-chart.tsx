"use client";

import { useEffect, useId, useRef, useState } from "react";
import { smoothPath } from "./sparkline";
import type { Point } from "./column-chart";

/**
 * Smooth area chart for a trend, with an optional dashed comparison line
 * (e.g. the previous period). Hovering shows a crosshair and both values.
 */
export function AreaChart({
  data,
  compare,
  format,
  height = 260,
  labelEvery = 5,
  seriesLabel = "This period",
  compareLabel = "Previous period",
}: {
  data: Point[];
  compare?: Point[];
  format: (n: number) => string;
  height?: number;
  labelEvery?: number;
  seriesLabel?: string;
  compareLabel?: string;
}) {
  const gradient = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 48, r: 12, t: 12, b: 28 };
  const n = data.length;
  const innerW = Math.max(width - pad.l - pad.r, 1);
  const innerH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.value), ...(compare ?? []).map((d) => d.value), 1));
  const x = (i: number) => pad.l + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const line = smoothPath(data.map((d, i) => [x(i), y(d.value)]));
  const prev = compare && smoothPath(compare.map((d, i) => [x(i), y(d.value)]));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const h = hover !== null ? data[hover] : null;
  const hp = hover !== null ? compare?.[hover] : undefined;

  return (
    <div>
      {compare && (
        <div className="mb-3 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-brand-500" />
            {seriesLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-slate-300" />
            {compareLabel}
          </span>
        </div>
      )}
      <div ref={box} className="relative select-none" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#d6d9e0" : "#eceef2"} strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={pad.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-faint text-[11px]">
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-faint text-[11px]">
                  {d.label}
                </text>
              ) : null,
            )}
            {prev && <path d={prev} fill="none" stroke="#c3c8d4" strokeWidth="1.5" strokeDasharray="4 4" />}
            <path d={`${line} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={`url(#${gradient})`} />
            <path d={line} fill="none" stroke="#5b5bf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke="#0f1729" strokeOpacity="0.18" />
                {hp && <circle cx={x(hover)} cy={y(hp.value)} r="3.5" fill="white" stroke="#aab0bf" strokeWidth="1.5" />}
                <circle cx={x(hover)} cy={y(data[hover].value)} r="4.5" fill="#5b5bf6" stroke="white" strokeWidth="2" />
              </g>
            )}
            <rect
              x={pad.l}
              y={0}
              width={innerW}
              height={height}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
              aria-label="Chart: hover to see daily values"
            />
          </svg>
        )}
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur"
            style={{ left: x(hover), transform: `translateX(${hover > n * 0.7 ? "calc(-100% - 12px)" : "12px"})` }}
          >
            <p className="text-[11px] font-medium text-muted">{h.label}</p>
            <div className="mt-1 flex items-center justify-between gap-4 text-[13px]">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2 rounded-full bg-brand-500" />
                {seriesLabel}
              </span>
              <span className="tabular font-semibold text-ink">{format(h.value)}</span>
            </div>
            {hp && (
              <div className="mt-0.5 flex items-center justify-between gap-4 text-[13px]">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full bg-slate-300" />
                  {compareLabel}
                </span>
                <span className="tabular text-ink-2">{format(hp.value)}</span>
              </div>
            )}
            {h.sub && <p className="mt-1 border-t border-line pt-1 text-[11px] text-muted">{h.sub}</p>}
          </div>
        )}
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
