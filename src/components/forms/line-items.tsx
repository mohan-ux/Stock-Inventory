"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { GST_RATE, lineTotal, withTax } from "@/lib/inventory";
import { money, qty as fmtQty } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Category, Item, Line } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type DraftLine = { key: number; itemId: string; qty: string; rate: string };

let k = 1;
export const draftLine = (l?: Partial<Line>): DraftLine => ({
  key: k++,
  itemId: l?.itemId ?? "",
  qty: l?.qty ? String(l.qty) : "",
  rate: l?.rate !== undefined ? String(l.rate) : "",
});

export const toLines = (d: DraftLine[]): Line[] =>
  d.filter((l) => l.itemId).map((l) => ({ itemId: l.itemId, qty: Number(l.qty), rate: Number(l.rate) }));

/**
 * Editable line items shared by invoices and purchase orders.
 * "sale" mode prices at the selling price and warns when stock is short;
 * "purchase" mode prices at the latest cost and shows stock after receipt.
 */
export function LineItems({ mode, lines, onChange }: { mode: "sale" | "purchase"; lines: DraftLine[]; onChange: (l: DraftLine[]) => void }) {
  const { state } = useStore();
  const byCategory = useMemo(() => {
    const m = new Map<Category, Item[]>();
    for (const i of [...state.items].sort((a, b) => a.name.localeCompare(b.name))) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [state.items]);
  const itemOf = (id: string) => state.items.find((i) => i.id === id);

  const update = (key: number, patch: Partial<DraftLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickItem = (key: number, itemId: string) => {
    const it = itemOf(itemId);
    update(key, { itemId, rate: it ? String(mode === "sale" ? it.price : it.cost) : "" });
  };
  const used = new Set(lines.map((l) => l.itemId));
  const subtotal = lineTotal(toLines(lines).map((l) => ({ ...l, qty: l.qty || 0, rate: l.rate || 0 })));

  return (
    <div>
      <div className="hidden grid-cols-[1fr_76px_96px_92px_32px] gap-2 px-0.5 pb-1.5 text-xs font-medium text-muted sm:grid">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate (₹)</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <div className="space-y-2.5">
        {lines.map((l) => {
          const it = itemOf(l.itemId);
          const q = Number(l.qty) || 0;
          const short = mode === "sale" && it && q > it.qty;
          return (
            <div key={l.key} className="rounded-lg border border-line p-2.5 sm:border-0 sm:p-0">
              <div className="grid grid-cols-[1fr_76px_96px_32px] items-center gap-2 sm:grid-cols-[1fr_76px_96px_92px_32px]">
                <Select value={l.itemId} onChange={(e) => pickItem(l.key, e.target.value)} className="col-span-4 sm:col-span-1" aria-label="Item">
                  <option value="">Select an item…</option>
                  {byCategory.map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map((i) => (
                        <option key={i.id} value={i.id} disabled={used.has(i.id) && i.id !== l.itemId}>
                          {i.name} — {fmtQty(i.qty)} {i.unit}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Quantity"
                  value={l.qty}
                  onChange={(e) => update(l.key, { qty: e.target.value })}
                  className={cn("tabular text-right", short && "border-rose-300 focus:border-rose-400 focus:ring-rose-500/15")}
                />
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  aria-label="Rate"
                  value={l.rate}
                  onChange={(e) => update(l.key, { rate: e.target.value })}
                  className="tabular text-right"
                />
                <span className="tabular hidden text-right text-sm text-ink sm:block">{money(q * (Number(l.rate) || 0))}</span>
                <IconButton label="Remove line" onClick={() => onChange(lines.filter((x) => x.key !== l.key))} disabled={lines.length === 1}>
                  <Trash2 />
                </IconButton>
              </div>
              {it && (
                <p className={cn("mt-1 px-0.5 text-xs", short ? "text-rose-600" : "text-muted")}>
                  {mode === "sale"
                    ? short
                      ? `Only ${fmtQty(it.qty)} ${it.unit} available in ${it.godown}`
                      : `${fmtQty(it.qty)} ${it.unit} available · ${fmtQty(Math.max(it.qty - q, 0))} left after this sale`
                    : `On hand ${fmtQty(it.qty)} → ${fmtQty(it.qty + q)} ${it.unit} after receipt · min ${it.minLevel}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Button size="sm" variant="ghost" className="mt-2 -ml-2 text-brand-600 hover:text-brand-700" onClick={() => onChange([...lines, draftLine()])}>
        <Plus /> Add line
      </Button>

      <div className="mt-4 ml-auto max-w-64 space-y-1.5 border-t border-line pt-3 text-sm">
        <Row label="Subtotal" value={money(subtotal)} />
        <Row label={`GST (${GST_RATE * 100}%)`} value={money(withTax(subtotal) - subtotal)} />
        <Row label="Total" value={money(withTax(subtotal))} strong />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong ? "pt-1 text-base font-semibold text-ink" : "text-muted")}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
