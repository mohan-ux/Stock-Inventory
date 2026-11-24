"use client";

import { Pencil, RefreshCcw, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { incomingByItem, stockStatus, suggestedReorder } from "@/lib/inventory";
import { fmtDate, fmtDateTime, money, qty as fmtQty } from "@/lib/format";
import { useLookups, useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LevelMeter } from "@/components/ui/card";
import { DL, DrawerLayout, Section } from "@/components/ui/drawer";
import { usePanels } from "@/components/shell/panels";
import { MovementRef, MovementType } from "@/components/movement";
import { ItemThumb } from "@/components/ui/avatar";

export function ItemDetail({ id }: { id: string }) {
  const { state, now } = useStore();
  const { supplier } = useLookups();
  const panels = usePanels();
  const it = state.items.find((i) => i.id === id);
  if (!it) return <DrawerLayout title="Item not found">This item no longer exists.</DrawerLayout>;

  const incoming = incomingByItem(state).get(it.id) ?? 0;
  const openPOs = state.purchases.filter((p) => p.status === "Pending" && p.lines.some((l) => l.itemId === it.id));
  const history = state.movements.filter((m) => m.itemId === it.id);
  const sold30 = history.filter((m) => m.type === "OUT" && now - new Date(m.date).getTime() < 30 * 86_400_000).reduce((s, m) => s - m.qty, 0);
  const sup = supplier.get(it.supplierId);
  const cover = sold30 > 0 ? Math.floor(it.qty / (sold30 / 30)) : null;

  const reorder = () =>
    panels.push({ kind: "newPurchase", supplierId: it.supplierId, lines: [{ itemId: it.id, qty: suggestedReorder(it, incoming), rate: it.cost }] });

  return (
    <DrawerLayout
      eyebrow={`${it.sku} · ${it.category}`}
      icon={<ItemThumb category={it.category} size="lg" />}
      title={
        <span className="flex flex-wrap items-center gap-3">
          {it.name} <StatusBadge status={stockStatus(it)} />
        </span>
      }
      meta={<span>{it.godown}</span>}
      footer={
        <>
          <Button onClick={() => panels.push({ kind: "editItem", id: it.id })}>
            <Pencil /> Edit
          </Button>
          <Button onClick={() => panels.push({ kind: "adjust", itemId: it.id })}>
            <SlidersHorizontal /> Adjust
          </Button>
          <Button onClick={() => panels.push({ kind: "newSale", itemId: it.id })} disabled={it.qty <= 0}>
            <ShoppingCart /> Sell
          </Button>
          <Button variant="primary" onClick={reorder}>
            <RefreshCcw /> Reorder
          </Button>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Metric label="On hand" value={`${fmtQty(it.qty)}`} unit={it.unit} />
        <Metric label="Incoming" value={fmtQty(incoming)} unit={it.unit} />
        <Metric label="Sold · 30d" value={fmtQty(sold30)} unit={it.unit} />
      </div>
      <div className="mb-6">
        <LevelMeter qty={it.qty} min={it.minLevel} />
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>Minimum {fmtQty(it.minLevel)} {it.unit}</span>
          <span>{cover === null ? "No sales in 30 days" : `≈ ${cover} days of cover at current sales`}</span>
        </div>
      </div>

      <Section title="Details">
        <DL
          rows={[
            ["Cost price", money(it.cost)],
            ["Selling price", money(it.price)],
            ["Stock value (cost)", money(it.cost * it.qty)],
            ["Margin", `${Math.round(((it.price - it.cost) / it.price) * 100)}%`],
            ["Preferred supplier", sup?.name ?? "—"],
            ["Lead time", sup ? `${sup.leadDays} days` : "—"],
          ]}
        />
      </Section>

      {openPOs.length > 0 && (
        <Section title="On order">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {openPOs.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => panels.push({ kind: "purchase", id: p.id })} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-canvas">
                  <span className="font-medium text-ink">{p.number}</span>
                  <span className="text-muted">
                    +{fmtQty(p.lines.find((l) => l.itemId === it.id)!.qty)} {it.unit} · expected {fmtDate(p.expectedDate)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Stock history · ${history.length} movements`}>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Movement</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 40).map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-muted">{fmtDateTime(m.date)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MovementType type={m.type} />
                      <MovementRef refNo={m.ref} />
                    </div>
                    <div className="mt-0.5 max-w-52 truncate text-xs text-muted">{m.note}</div>
                  </td>
                  <td className={`tabular px-3 py-2 text-right font-medium ${m.qty > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {m.qty > 0 ? "+" : ""}
                    {fmtQty(m.qty)}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-ink-2">{fmtQty(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length > 40 && <p className="border-t border-line px-3 py-2 text-center text-xs text-muted">Showing latest 40 · full ledger in Stock → History</p>}
        </div>
      </Section>
    </DrawerLayout>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold text-ink">
        {value} <span className="text-xs font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}
