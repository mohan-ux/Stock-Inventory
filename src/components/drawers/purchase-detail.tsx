"use client";

import { PackageCheck, Truck } from "lucide-react";
import { purchaseDisplayStatus, purchaseTotal, unitsOf } from "@/lib/inventory";
import { fmtDate, fmtDateTime, money, qty as fmtQty } from "@/lib/format";
import { useLookups, useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DL, DrawerIcon, DrawerLayout, Section } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { ConfirmButton } from "@/components/forms/form-bits";
import { LinesTable, PartyLink, Timeline } from "./shared";

export function PurchaseDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const { supplier, item } = useLookups();
  const toast = useToast();
  const po = state.purchases.find((p) => p.id === id);
  if (!po) return <DrawerLayout title="Order not found">This purchase order no longer exists.</DrawerLayout>;

  const s = supplier.get(po.supplierId);
  const status = purchaseDisplayStatus(po);

  const receive = () => {
    const r = dispatch({ type: "purchase/receive", id });
    if (r.ok) toast({ title: `${po.number} received`, description: `${fmtQty(unitsOf(po.lines))} units added to stock.`, action: { label: "View stock", href: "/stock" } });
  };
  const cancel = () => {
    const r = dispatch({ type: "purchase/cancel", id });
    if (r.ok) toast({ title: `${po.number} cancelled` });
  };

  return (
    <DrawerLayout
      eyebrow="Purchase order"
      icon={<DrawerIcon icon={Truck} tone="sky" />}
      title={
        <span className="flex items-center gap-3">
          {po.number} <StatusBadge status={status} />
        </span>
      }
      meta={
        <>
          <span className="tabular text-base font-semibold text-ink">{money(purchaseTotal(po))}</span>
          <span>·</span>
          <span>{fmtQty(unitsOf(po.lines))} units</span>
        </>
      }
      footer={
        po.status === "Pending" && (
          <>
            <ConfirmButton confirm="Confirm cancel" onConfirm={cancel}>
              Cancel order
            </ConfirmButton>
            <Button variant="primary" onClick={receive}>
              <PackageCheck /> Mark as received
            </Button>
          </>
        )
      }
    >
      <Section title="Supplier">
        <DL
          rows={[
            ["Supplier", s ? <PartyLink kind="supplier" id={s.id} name={s.name} /> : "—"],
            ["Contact", s ? `${s.contact} · ${s.phone}` : "—"],
            ["Ordered", fmtDate(po.date)],
            [
              po.status === "Received" ? "Received" : "Expected",
              <span key="e" className={status === "Late" ? "font-medium text-rose-600" : ""}>
                {fmtDate(po.receivedDate ?? po.expectedDate)}
              </span>,
            ],
          ]}
        />
      </Section>
      <Section title="Items">
        <LinesTable
          lines={po.lines}
          extra={(l) => {
            const it = item.get(l.itemId);
            if (!it || po.status !== "Pending") return null;
            return (
              <span className="ml-1.5">
                · on hand {fmtQty(it.qty)} → <span className="font-medium text-emerald-700">{fmtQty(it.qty + l.qty)}</span>
              </span>
            );
          }}
        />
      </Section>
      <Section title="Timeline">
        <Timeline
          steps={[
            { label: "Order placed", date: fmtDateTime(po.date), done: true },
            po.status === "Cancelled"
              ? { label: "Cancelled · no stock affected", done: true, tone: "red" }
              : po.status === "Received"
                ? { label: "Goods received · stock increased", date: po.receivedDate && fmtDateTime(po.receivedDate), done: true }
                : { label: status === "Late" ? `Late — was expected ${fmtDate(po.expectedDate)}` : `Expected ${fmtDate(po.expectedDate)}`, done: false },
          ]}
        />
      </Section>
    </DrawerLayout>
  );
}
