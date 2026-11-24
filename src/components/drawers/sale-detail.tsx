"use client";

import { FileText, Printer } from "lucide-react";
import { saleDisplayStatus, saleTotal, unitsOf } from "@/lib/inventory";
import { fmtDate, fmtDateTime, money } from "@/lib/format";
import { useLookups, useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DL, DrawerIcon, DrawerLayout, Section, printDrawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { ConfirmButton } from "@/components/forms/form-bits";
import { LinesTable, PartyLink, Timeline } from "./shared";

export function SaleDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const { customer } = useLookups();
  const toast = useToast();
  const sale = state.sales.find((s) => s.id === id);
  if (!sale) return <DrawerLayout title="Invoice not found">This invoice no longer exists.</DrawerLayout>;

  const c = customer.get(sale.customerId);
  const status = saleDisplayStatus(sale);
  const total = saleTotal(sale);

  const markPaid = () => {
    const r = dispatch({ type: "sale/markPaid", id });
    if (r.ok) toast({ title: `${sale.number} marked paid`, description: `${money(total)} received from ${c?.name}.` });
  };
  const cancel = () => {
    const r = dispatch({ type: "sale/cancel", id });
    if (r.ok) toast({ title: `${sale.number} cancelled`, description: `${unitsOf(sale.lines)} units returned to stock.`, action: { label: "View stock", href: "/stock" } });
  };

  return (
    <DrawerLayout
      eyebrow="Invoice"
      icon={<DrawerIcon icon={FileText} />}
      title={
        <span className="flex items-center gap-3">
          {sale.number} <StatusBadge status={status} />
        </span>
      }
      meta={
        <>
          <span className="tabular text-base font-semibold text-ink">{money(total)}</span>
          <span>·</span>
          <span>{unitsOf(sale.lines)} units</span>
        </>
      }
      footer={
        sale.status !== "Cancelled" && (
          <>
            <ConfirmButton confirm="Confirm — return stock" onConfirm={cancel}>
              Cancel invoice
            </ConfirmButton>
            <Button onClick={printDrawer}>
              <Printer /> Print
            </Button>
            {sale.status === "Unpaid" && (
              <Button variant="primary" onClick={markPaid}>
                Mark as paid
              </Button>
            )}
          </>
        )
      }
    >
      <div className="mb-6 hidden items-start justify-between border-b border-line pb-4 print:flex">
        <div>
          <p className="text-lg font-semibold text-ink">Stockwise Traders</p>
          <p className="text-xs text-muted">Chennai Main · Coimbatore Hub</p>
        </div>
        <p className="text-sm font-semibold tracking-wide text-ink uppercase">Tax invoice</p>
      </div>
      <Section title="Bill to">
        <DL
          rows={[
            ["Customer", c ? <PartyLink kind="customer" id={c.id} name={c.name} /> : "—"],
            ["Contact", c ? `${c.contact} · ${c.phone}` : "—"],
            ["Invoice date", fmtDate(sale.date)],
            ["Due date", <span key="d" className={status === "Overdue" ? "font-medium text-rose-600" : ""}>{fmtDate(sale.dueDate)}</span>],
          ]}
        />
      </Section>
      <Section title="Items">
        <LinesTable lines={sale.lines} />
      </Section>
      <Section title="Timeline">
        <Timeline
          steps={[
            { label: "Invoice created · stock deducted", date: fmtDateTime(sale.date), done: true },
            sale.status === "Cancelled"
              ? { label: "Cancelled · stock returned", done: true, tone: "red" }
              : sale.status === "Paid"
                ? { label: "Payment received", date: sale.paidDate && fmtDateTime(sale.paidDate), done: true }
                : { label: status === "Overdue" ? `Payment overdue since ${fmtDate(sale.dueDate)}` : `Payment due ${fmtDate(sale.dueDate)}`, done: false },
          ]}
        />
      </Section>
    </DrawerLayout>
  );
}
