/**
 * Read-only figures for the dashboard and reports. Everything is derived from
 * the same state the engine maintains, so reports always agree with the lists.
 */
import { DAY, fmtShort } from "./format";
import { purchaseTotal, saleTotal } from "./inventory";
import type { Purchase, Sale, State } from "./types";

export type Period = "7d" | "30d" | "90d" | "all";
export const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];
const periodDays = { "7d": 7, "30d": 30, "90d": 90, all: 3650 } as const;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** [from, to) window for a period, ending now. */
export function periodRange(p: Period, now = Date.now()) {
  return { from: startOfDay(now) - (periodDays[p] - 1) * DAY, to: now + 1 };
}

export const inRange = (iso: string, r: { from: number; to: number }) => {
  const t = new Date(iso).getTime();
  return t >= r.from && t < r.to;
};

export const liveSales = (s: State) => s.sales.filter((x) => x.status !== "Cancelled");
export const livePurchases = (s: State) => s.purchases.filter((x) => x.status !== "Cancelled");

/** Daily (or weekly, for long ranges) totals for a column chart. */
export function series<T extends Sale | Purchase>(docs: T[], value: (d: T) => number, days: number, now = Date.now()) {
  const weekly = days > 45;
  const bucket = weekly ? 7 : 1;
  const n = Math.ceil(days / bucket);
  const end = startOfDay(now) + DAY;
  const start = end - n * bucket * DAY;
  const out = Array.from({ length: n }, (_, i) => {
    const from = start + i * bucket * DAY;
    return { from, label: weekly ? `w/c ${fmtShort(new Date(from).toISOString())}` : fmtShort(new Date(from).toISOString()), value: 0, count: 0 };
  });
  for (const d of docs) {
    const t = new Date(d.date).getTime();
    if (t < start || t >= end) continue;
    const b = out[Math.floor((t - start) / (bucket * DAY))];
    b.value += value(d);
    b.count++;
  }
  return out.map((b) => ({ label: b.label, value: b.value, sub: `${b.count} ${b.count === 1 ? "order" : "orders"}` }));
}

/**
 * A 30-day trend as a 7-day rolling average, ending at `end`. Each point keeps
 * the actual day's total in `sub`, for the tooltip.
 */
export function rollingAverage<T extends Sale | Purchase>(docs: T[], value: (d: T) => number, end: number, fmt: (n: number) => string, days = 30, window = 7) {
  const daily = series(docs, value, days + window - 1, end);
  return daily.slice(window - 1).map((p, i) => ({
    label: p.label,
    value: sum(daily.slice(i, i + window).map((x) => x.value)) / window,
    sub: `That day: ${fmt(p.value)} · ${p.sub}`,
  }));
}

/** Revenue, units and orders per item for sales in a range. */
export function salesByItem(sales: Sale[]) {
  const m = new Map<string, { revenue: number; units: number; orders: number }>();
  for (const s of sales)
    for (const l of s.lines) {
      const r = m.get(l.itemId) ?? { revenue: 0, units: 0, orders: 0 };
      r.revenue += l.qty * l.rate;
      r.units += l.qty;
      r.orders++;
      m.set(l.itemId, r);
    }
  return m;
}

export function totalBy<T>(docs: T[], key: (d: T) => string, value: (d: T) => number) {
  const m = new Map<string, number>();
  for (const d of docs) m.set(key(d), (m.get(key(d)) ?? 0) + value(d));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
export const salesValue = (s: Sale[]) => sum(s.map(saleTotal));
export const purchasesValue = (p: Purchase[]) => sum(p.map(purchaseTotal));

/** Download rows as a CSV file. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
