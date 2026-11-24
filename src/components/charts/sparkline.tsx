import { useId } from "react";

/** A tiny trend line for stat tiles. Decorative: the tile's number carries the value. */
export function Sparkline({ values, className, tone = "brand" }: { values: number[]; className?: string; tone?: "brand" | "green" | "amber" | "red" }) {
  const id = useId();
  const color = { brand: "#5b5bf6", green: "#10b981", amber: "#f59e0b", red: "#f43f5e" }[tone];
  const W = 120;
  const H = 36;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 6)]);
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Monotone-ish smoothing: a cubic through each point with horizontal tangents. */
export function smoothPath(pts: number[][]) {
  if (!pts.length) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}
