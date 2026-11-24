"use client";

import { BarChart3, Boxes, CornerDownLeft, FileText, LayoutDashboard, Package, Plus, Search, ShoppingCart, Truck, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { purchaseTotal, saleTotal } from "@/lib/inventory";
import { money, qty } from "@/lib/format";
import { useLookups, useStore } from "@/lib/store";
import { usePanels } from "./panels";

type Cmd = { id: string; group: string; label: string; hint?: string; icon: React.ElementType; run: () => void };

/** Ctrl/⌘ K — jump to any item, invoice, PO or contact, or start an action. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const { customer, supplier } = useLookups();
  const panels = usePanels();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      { id: "a1", group: "Actions", label: "New invoice", icon: Plus, run: () => panels.open({ kind: "newSale" }) },
      { id: "a2", group: "Actions", label: "New purchase order", icon: Plus, run: () => panels.open({ kind: "newPurchase" }) },
      { id: "a3", group: "Actions", label: "Add item", icon: Plus, run: () => panels.open({ kind: "newItem" }) },
      { id: "n1", group: "Go to", label: "Dashboard", icon: LayoutDashboard, run: go("/") },
      { id: "n2", group: "Go to", label: "Sales", icon: ShoppingCart, run: go("/sales") },
      { id: "n3", group: "Go to", label: "Purchases", icon: Truck, run: go("/purchases") },
      { id: "n4", group: "Go to", label: "Stock", icon: Boxes, run: go("/stock") },
      { id: "n5", group: "Go to", label: "Reports", icon: BarChart3, run: go("/reports") },
      { id: "n6", group: "Go to", label: "Contacts", icon: Users, run: go("/contacts") },
      ...state.items.map((i) => ({
        id: i.id,
        group: "Items",
        label: `${i.name}`,
        hint: `${i.sku} · ${qty(i.qty)} ${i.unit}`,
        icon: Package,
        run: () => panels.open({ kind: "item", id: i.id }),
      })),
      ...state.sales.map((s) => ({
        id: s.id,
        group: "Invoices",
        label: `${s.number} · ${customer.get(s.customerId)?.name ?? ""}`,
        hint: money(saleTotal(s)),
        icon: FileText,
        run: () => panels.open({ kind: "sale", id: s.id }),
      })),
      ...state.purchases.map((p) => ({
        id: p.id,
        group: "Purchase orders",
        label: `${p.number} · ${supplier.get(p.supplierId)?.name ?? ""}`,
        hint: money(purchaseTotal(p)),
        icon: Truck,
        run: () => panels.open({ kind: "purchase", id: p.id }),
      })),
      ...state.customers.map((c) => ({ id: c.id, group: "Customers", label: c.name, hint: c.city, icon: User, run: () => panels.open({ kind: "customer", id: c.id }) })),
      ...state.suppliers.map((s) => ({ id: s.id, group: "Suppliers", label: s.name, hint: s.city, icon: User, run: () => panels.open({ kind: "supplier", id: s.id }) })),
    ];
  }, [state, customer, supplier, panels, router]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return commands.filter((c) => c.group === "Actions" || c.group === "Go to");
    const hits = commands.filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""} ${c.group}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // Cap each group so one kind doesn't crowd out the rest.
    const per = new Map<string, number>();
    return hits.filter((h) => {
      const n = (per.get(h.group) ?? 0) + 1;
      per.set(h.group, n);
      return n <= 6;
    });
  }, [q, commands]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset each time the palette opens
    setQ("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (c: Cmd | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      run(results[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-label="Search" className="relative w-full max-w-[600px] animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search items, invoices, orders, contacts…"
            className="h-13 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <div ref={list} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted">No matches for “{q}”.</p>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id + c.group}>
                {header && <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">{header}</p>}
                <button
                  type="button"
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm", i === active ? "bg-brand-50 text-brand-700" : "text-ink-2")}
                >
                  <c.icon className={cn("size-4 shrink-0", i === active ? "text-brand-600" : "text-faint")} />
                  <span className="truncate">{c.label}</span>
                  {c.hint && <span className="tabular ml-auto shrink-0 text-xs text-muted">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-brand-500" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
