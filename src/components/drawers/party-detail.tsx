"use client";

import { Mail, Phone, Plus } from "lucide-react";
import { purchaseDisplayStatus, purchaseTotal, saleDisplayStatus, saleTotal } from "@/lib/inventory";
import { fmtDate, money } from "@/lib/format";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerLayout, Section } from "@/components/ui/drawer";
import { usePanels } from "@/components/shell/panels";
import { Avatar } from "@/components/ui/avatar";

export function PartyDetail({ kind, id }: { kind: "customer" | "supplier"; id: string }) {
  const { state } = useStore();
  const panels = usePanels();
  const party = kind === "customer" ? state.customers.find((c) => c.id === id) : state.suppliers.find((s) => s.id === id);
  if (!party) return <DrawerLayout title="Contact not found">This contact no longer exists.</DrawerLayout>;

  const docs =
    kind === "customer"
      ? state.sales
          .filter((s) => s.customerId === id)
          .map((s) => ({ id: s.id, number: s.number, date: s.date, amount: saleTotal(s), status: saleDisplayStatus(s), open: s.status === "Unpaid", live: s.status !== "Cancelled" }))
      : state.purchases
          .filter((p) => p.supplierId === id)
          .map((p) => ({ id: p.id, number: p.number, date: p.date, amount: purchaseTotal(p), status: purchaseDisplayStatus(p), open: p.status === "Pending", live: p.status !== "Cancelled" }));

  const total = docs.filter((d) => d.live).reduce((s, d) => s + d.amount, 0);
  const open = docs.filter((d) => d.open);
  const openAmount = open.reduce((s, d) => s + d.amount, 0);

  return (
    <DrawerLayout
      eyebrow={kind === "customer" ? "Customer" : "Supplier"}
      icon={<Avatar name={party.name} size="lg" />}
      title={party.name}
      meta={
        <>
          <span>{party.contact}</span>
          <span>·</span>
          <span>{party.city}</span>
          {kind === "supplier" && "leadDays" in party && (
            <>
              <span>·</span>
              <span>{String(party.leadDays)}-day lead time</span>
            </>
          )}
        </>
      }
      footer={
        <Button variant="primary" onClick={() => panels.push(kind === "customer" ? { kind: "newSale", customerId: id } : { kind: "newPurchase", supplierId: id })}>
          <Plus /> {kind === "customer" ? "New invoice" : "New purchase order"}
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`tel:${party.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-ink-2 hover:bg-canvas">
          <Phone className="size-3.5" /> {party.phone}
        </a>
        <a href={`mailto:${party.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-ink-2 hover:bg-canvas">
          <Mail className="size-3.5" /> {party.email}
        </a>
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Metric label={kind === "customer" ? "Total billed" : "Total purchased"} value={money(total)} />
        <Metric label={kind === "customer" ? "Outstanding" : "On order"} value={money(openAmount)} />
        <Metric label={kind === "customer" ? "Invoices" : "Orders"} value={String(docs.length)} />
      </div>
      <Section title={kind === "customer" ? "Invoices" : "Purchase orders"}>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {docs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => panels.push(kind === "customer" ? { kind: "sale", id: d.id } : { kind: "purchase", id: d.id })}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-canvas"
                >
                  <span className="w-20 font-medium text-ink">{d.number}</span>
                  <span className="flex-1 text-muted">{fmtDate(d.date)}</span>
                  <span className="tabular text-ink">{money(d.amount)}</span>
                  <span className="w-24 text-right">
                    <StatusBadge status={d.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </DrawerLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-0.5 truncate text-[15px] font-semibold text-ink">{value}</p>
    </div>
  );
}
