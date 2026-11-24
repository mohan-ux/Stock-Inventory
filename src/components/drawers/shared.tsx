"use client";

import { GST_RATE, lineTotal, withTax } from "@/lib/inventory";
import { money, qty as fmtQty } from "@/lib/format";
import { useLookups } from "@/lib/store";
import type { Line } from "@/lib/types";
import { usePanels } from "@/components/shell/panels";
import { cn } from "@/lib/cn";

/** Read-only line items with totals, used on invoices and POs. */
export function LinesTable({ lines, extra }: { lines: Line[]; extra?: (l: Line) => React.ReactNode }) {
  const { item } = useLookups();
  const panels = usePanels();
  const sub = lineTotal(lines);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-canvas text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Rate</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const it = item.get(l.itemId);
            return (
              <tr key={l.itemId} className="border-t border-line">
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => panels.push({ kind: "item", id: l.itemId })} className="text-left font-medium text-ink hover:text-brand-600">
                    {it?.name ?? "Deleted item"}
                  </button>
                  <div className="text-xs text-muted">
                    {it?.sku}
                    {extra?.(l)}
                  </div>
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink-2">
                  {fmtQty(l.qty)} <span className="text-faint">{it?.unit}</span>
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink-2">{money(l.rate)}</td>
                <td className="tabular px-3 py-2.5 text-right text-ink">{money(l.qty * l.rate)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-line text-sm">
          <tr>
            <td colSpan={3} className="px-3 pt-2.5 text-right text-muted">Subtotal</td>
            <td className="tabular px-3 pt-2.5 text-right text-ink-2">{money(sub)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-3 pt-1 text-right text-muted">GST {GST_RATE * 100}%</td>
            <td className="tabular px-3 pt-1 text-right text-ink-2">{money(withTax(sub) - sub)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-3 pt-1.5 pb-3 text-right font-semibold text-ink">Total</td>
            <td className="tabular px-3 pt-1.5 pb-3 text-right text-base font-semibold text-ink">{money(withTax(sub))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export type TimelineStep = { label: string; date?: string; done: boolean; tone?: "red" };

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute top-1.5 bottom-1.5 left-[7px] w-px bg-line" />
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span
            className={cn(
              "absolute top-1 -left-6 size-[15px] rounded-full border-2 bg-surface",
              s.done ? (s.tone === "red" ? "border-rose-500 bg-rose-500" : "border-brand-600 bg-brand-600") : "border-line-strong",
            )}
          >
            {s.done && <span className="absolute inset-[3px] rounded-full bg-white" />}
          </span>
          <p className={cn("text-sm", s.done ? "font-medium text-ink" : "text-muted")}>{s.label}</p>
          {s.date && <p className="text-xs text-muted">{s.date}</p>}
        </li>
      ))}
    </ol>
  );
}

export function PartyLink({ kind, id, name }: { kind: "customer" | "supplier"; id: string; name: string }) {
  const panels = usePanels();
  return (
    <button type="button" onClick={() => panels.push({ kind, id })} className="font-medium text-ink hover:text-brand-600">
      {name}
    </button>
  );
}
