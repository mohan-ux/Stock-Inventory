"use client";

import { Boxes, History, Plus, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { sum } from "@/lib/analytics";
import { fmtDateTime, money, moneyCompact, qty } from "@/lib/format";
import { incomingByItem, isLow, stockStatus } from "@/lib/inventory";
import { useLookups, useStore } from "@/lib/store";
import { useUrlState } from "@/lib/use-url-state";
import type { Category, Godown } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { ItemThumb } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, LevelMeter, PageHeader } from "@/components/ui/card";
import { SearchInput, Segmented, Select } from "@/components/ui/field";
import { SortTh, THead, Table, Td, Th, Tr, useSort } from "@/components/ui/table";
import { usePanels } from "@/components/shell/panels";
import { MovementRef, MovementType } from "@/components/movement";
import { CATEGORIES, GODOWNS } from "@/components/forms/item-form";

const VIEWS = ["items", "history"] as const;
const STATUS = ["all", "low", "out"] as const;
const GODOWN_KEYS = ["all", "chennai", "coimbatore"] as const;
type GodownKey = (typeof GODOWN_KEYS)[number];
const godownOf: Record<Exclude<GodownKey, "all">, Godown> = { chennai: "Chennai Main", coimbatore: "Coimbatore Hub" };
const keyOf = (g: Godown): GodownKey => (g === "Chennai Main" ? "chennai" : "coimbatore");

export function StockView() {
  const { state } = useStore();
  const panels = usePanels();
  const [view, setView] = useUrlState("view", "items", VIEWS);
  const [godown, setGodown] = useUrlState<GodownKey>("godown", "all", GODOWN_KEYS);

  const godowns = GODOWNS.map((g) => {
    const items = state.items.filter((i) => i.godown === g);
    return { g, items: items.length, value: sum(items.map((i) => i.qty * i.cost)), low: items.filter(isLow).length, units: sum(items.map((i) => i.qty)) };
  });

  return (
    <>
      <PageHeader
        title="Stock"
        description="Items on hand across godowns. Quantities change only through sales, receipts and adjustments, so every unit has a history."
        actions={
          <Button variant="primary" onClick={() => panels.open({ kind: "newItem" })}>
            <Plus /> Add item
          </Button>
        }
      />

      {/* Godown view: pick a godown to filter both tabs */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GodownCard
          active={godown === "all"}
          onClick={() => setGodown("all")}
          title="All godowns"
          value={money(sum(godowns.map((g) => g.value)))}
          meta={`${state.items.length} items · ${qty(sum(godowns.map((g) => g.units)))} units`}
          low={sum(godowns.map((g) => g.low))}
        />
        {godowns.map((g) => (
          <GodownCard
            key={g.g}
            active={godown === keyOf(g.g)}
            onClick={() => setGodown(keyOf(g.g))}
            title={g.g}
            value={money(g.value)}
            meta={`${g.items} items · ${qty(g.units)} units`}
            low={g.low}
          />
        ))}
      </div>

      <div className="mb-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "items", label: "Items" },
            { value: "history", label: "Stock history" },
          ]}
        />
      </div>

      {view === "items" ? <ItemsTable godown={godown === "all" ? null : godownOf[godown]} /> : <Ledger godown={godown === "all" ? null : godownOf[godown]} />}
    </>
  );
}

function GodownCard({ active, onClick, title, value, meta, low }: { active: boolean; onClick: () => void; title: string; value: string; meta: string; low: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5",
        active ? "border-brand-500 ring-4 ring-brand-500/10" : "border-line/80 hover:border-line-strong",
      )}
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <span className={cn("flex size-7 items-center justify-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-canvas text-muted")}>
          <Warehouse className="size-3.5" />
        </span>
        {title}
        {low > 0 && <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[11px] leading-5 font-semibold text-amber-800">{low} low</span>}
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-[-0.02em] text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{meta} · value at cost</p>
    </button>
  );
}

function ItemsTable({ godown }: { godown: Godown | null }) {
  const { state } = useStore();
  const { supplier } = useLookups();
  const panels = usePanels();
  const [status, setStatus] = useUrlState("status", "all", STATUS);
  const [category, setCategory] = useState<Category | "">("");
  const [q, setQ] = useState("");
  const incoming = useMemo(() => incomingByItem(state), [state]);

  const scoped = state.items.filter((i) => !godown || i.godown === godown);
  const filtered = scoped.filter((i) => {
    if (status === "low" && !isLow(i)) return false;
    if (status === "out" && i.qty > 0) return false;
    if (category && i.category !== category) return false;
    const t = q.trim().toLowerCase();
    return !t || i.name.toLowerCase().includes(t) || i.sku.toLowerCase().includes(t);
  });
  const { sorted, sort, onSort } = useSort(
    filtered,
    (i, k: "name" | "category" | "qty" | "value" | "health") =>
      k === "name" ? i.name : k === "category" ? i.category : k === "qty" ? i.qty : k === "value" ? i.qty * i.cost : i.qty / Math.max(i.minLevel, 1),
    { key: "health", dir: 1 },
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All items", count: scoped.length },
            { value: "low", label: "Low stock", count: scoped.filter(isLow).length },
            { value: "out", label: "Out of stock", count: scoped.filter((i) => i.qty <= 0).length },
          ]}
        />
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Item name or SKU" className="min-w-0 flex-1 sm:w-56 sm:flex-none" />
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category | "")} inline aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={<Boxes />} title={status === "all" ? "No items match" : "Nothing here — stock is healthy"}>
          {status === "all" ? "Try a different search or category." : undefined}
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <SortTh k="name" sort={sort} onSort={onSort}>Item</SortTh>
            <SortTh k="category" sort={sort} onSort={onSort}>Category</SortTh>
            {!godown && <Th>Godown</Th>}
            <SortTh k="health" sort={sort} onSort={onSort} className="w-52">Stock level</SortTh>
            <SortTh k="qty" sort={sort} onSort={onSort} align="right">On hand</SortTh>
            <Th align="right">Min</Th>
            <Th align="right">Incoming</Th>
            <SortTh k="value" sort={sort} onSort={onSort} align="right">Value</SortTh>
            <Th>Status</Th>
          </THead>
          <tbody>
            {sorted.map((i) => {
              const inc = incoming.get(i.id) ?? 0;
              return (
                <Tr key={i.id} onClick={() => panels.open({ kind: "item", id: i.id })}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <ItemThumb category={i.category} />
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{i.name}</div>
                        <div className="text-xs text-muted">
                          <span className="tabular">{i.sku}</span> · {supplier.get(i.supplierId)?.name}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>{i.category}</Td>
                  {!godown && <Td>{i.godown}</Td>}
                  <Td>
                    <LevelMeter qty={i.qty} min={i.minLevel} />
                  </Td>
                  <Td align="right" className="font-medium text-ink">
                    {qty(i.qty)} <span className="font-normal text-faint">{i.unit}</span>
                  </Td>
                  <Td align="right">{qty(i.minLevel)}</Td>
                  <Td align="right" className={inc ? "font-medium text-emerald-700" : "text-faint"}>
                    {inc ? `+${qty(inc)}` : "—"}
                  </Td>
                  <Td align="right">{moneyCompact(i.qty * i.cost)}</Td>
                  <Td>
                    <StatusBadge status={stockStatus(i)} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

type LedgerType = "all" | "IN" | "OUT" | "ADJUST";

function Ledger({ godown }: { godown: Godown | null }) {
  const { state } = useStore();
  const { item } = useLookups();
  const panels = usePanels();
  const [type, setType] = useState<LedgerType>("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);

  const scoped = state.movements.filter((m) => !godown || item.get(m.itemId)?.godown === godown);
  const rows = scoped.filter((m) => {
    if (type !== "all" && m.type !== type) return false;
    const t = q.trim().toLowerCase();
    const it = item.get(m.itemId);
    return !t || [it?.name, it?.sku, m.ref, m.note].some((v) => v?.toLowerCase().includes(t));
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t);
            setLimit(60);
          }}
          options={[
            { value: "all", label: "All", count: scoped.length },
            { value: "IN", label: "Stock in", count: scoped.filter((m) => m.type === "IN").length },
            { value: "OUT", label: "Stock out", count: scoped.filter((m) => m.type === "OUT").length },
            { value: "ADJUST", label: "Adjustments", count: scoped.filter((m) => m.type === "ADJUST").length },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Item, SKU, INV / PO number" className="w-full sm:ml-auto sm:w-72" />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="No movements match" />
      ) : (
        <Table>
          <THead>
            <Th>Date</Th>
            <Th>Item</Th>
            <Th>Type</Th>
            <Th>Reference</Th>
            <Th>Note</Th>
            <Th align="right">Qty</Th>
            <Th align="right">Balance</Th>
          </THead>
          <tbody>
            {rows.slice(0, limit).map((m) => {
              const it = item.get(m.itemId);
              return (
                <Tr key={m.id} onClick={() => panels.open({ kind: "item", id: m.itemId })}>
                  <Td className="text-[13px] text-muted">{fmtDateTime(m.date)}</Td>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      {it && <ItemThumb category={it.category} size="sm" />}
                      <span className="font-medium text-ink">{it?.name}</span>
                    </span>
                  </Td>
                  <Td>
                    <MovementType type={m.type} />
                  </Td>
                  <Td>
                    <MovementRef refNo={m.ref} />
                  </Td>
                  <Td className="max-w-64 truncate text-[13px] text-muted">{m.note}</Td>
                  <Td align="right" className={cn("font-medium", m.qty > 0 ? "text-emerald-700" : "text-rose-600")}>
                    {m.qty > 0 ? "+" : ""}
                    {qty(m.qty)}
                  </Td>
                  <Td align="right" className="text-ink">
                    {qty(m.balance)}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
        <span>
          Showing {Math.min(limit, rows.length)} of {rows.length} movements
        </span>
        {rows.length > limit && (
          <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 100)}>
            Load more
          </Button>
        )}
      </div>
    </Card>
  );
}
