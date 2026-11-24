"use client";

import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { sum } from "@/lib/analytics";
import { fmtDate, money } from "@/lib/format";
import { purchaseTotal, saleDisplayStatus, saleTotal } from "@/lib/inventory";
import { useStore } from "@/lib/store";
import { useUrlState } from "@/lib/use-url-state";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SearchInput, Segmented } from "@/components/ui/field";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { usePanels } from "@/components/shell/panels";

const TABS = ["customers", "suppliers"] as const;

export function ContactsView() {
  const { state } = useStore();
  const panels = usePanels();
  const [tab, setTab] = useUrlState("tab", "customers", TABS);
  const [q, setQ] = useState("");

  const customers = useMemo(
    () =>
      state.customers.map((c) => {
        const sales = state.sales.filter((s) => s.customerId === c.id && s.status !== "Cancelled");
        const unpaid = sales.filter((s) => s.status === "Unpaid");
        return {
          c,
          billed: sum(sales.map(saleTotal)),
          outstanding: sum(unpaid.map(saleTotal)),
          overdue: unpaid.filter((s) => saleDisplayStatus(s) === "Overdue").length,
          last: sales[0]?.date,
          count: sales.length,
        };
      }),
    [state.customers, state.sales],
  );
  const suppliers = useMemo(
    () =>
      state.suppliers.map((s) => {
        const pos = state.purchases.filter((p) => p.supplierId === s.id && p.status !== "Cancelled");
        return {
          s,
          value: sum(pos.map(purchaseTotal)),
          pending: pos.filter((p) => p.status === "Pending").length,
          items: state.items.filter((i) => i.supplierId === s.id).length,
          last: pos[0]?.date,
          count: pos.length,
        };
      }),
    [state.suppliers, state.purchases, state.items],
  );

  const t = q.trim().toLowerCase();
  const match = (p: { name: string; contact: string; city: string }) => !t || [p.name, p.contact, p.city].some((v) => v.toLowerCase().includes(t));

  return (
    <>
      <PageHeader title="Contacts" description="Customers you sell to and suppliers you buy from." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "customers", label: "Customers", count: state.customers.length },
              { value: "suppliers", label: "Suppliers", count: state.suppliers.length },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Name, contact or city" className="w-full sm:ml-auto sm:w-64" />
        </div>
        {tab === "customers" ? (
          (() => {
            const rows = customers.filter((r) => match(r.c));
            if (!rows.length) return <EmptyState icon={<Users />} title="No customers match" />;
            return (
              <Table>
                <THead>
                  <Th>Customer</Th>
                  <Th>City</Th>
                  <Th align="right">Invoices</Th>
                  <Th align="right">Total billed</Th>
                  <Th align="right">Outstanding</Th>
                  <Th>Last invoice</Th>
                </THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.c.id} onClick={() => panels.open({ kind: "customer", id: r.c.id })}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.c.name} />
                          <div>
                            <div className="font-medium text-ink">{r.c.name}</div>
                            <div className="text-xs text-muted">
                              {r.c.contact} · {r.c.phone}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>{r.c.city}</Td>
                      <Td align="right">{r.count}</Td>
                      <Td align="right" className="font-medium text-ink">
                        {money(r.billed)}
                      </Td>
                      <Td align="right">
                        <span className="inline-flex items-center gap-2">
                          {r.overdue > 0 && <Badge tone="red">{r.overdue} overdue</Badge>}
                          {r.outstanding ? money(r.outstanding) : "—"}
                        </span>
                      </Td>
                      <Td>{r.last ? fmtDate(r.last) : "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            );
          })()
        ) : (
          (() => {
            const rows = suppliers.filter((r) => match(r.s));
            if (!rows.length) return <EmptyState icon={<Users />} title="No suppliers match" />;
            return (
              <Table>
                <THead>
                  <Th>Supplier</Th>
                  <Th>City</Th>
                  <Th align="right">Items supplied</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Total purchased</Th>
                  <Th align="right">Lead time</Th>
                  <Th>Last order</Th>
                </THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.s.id} onClick={() => panels.open({ kind: "supplier", id: r.s.id })}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.s.name} />
                          <div>
                            <div className="font-medium text-ink">{r.s.name}</div>
                            <div className="text-xs text-muted">
                              {r.s.contact} · {r.s.phone}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>{r.s.city}</Td>
                      <Td align="right">{r.items}</Td>
                      <Td align="right">
                        <span className="inline-flex items-center gap-2">
                          {r.pending > 0 && <Badge tone="amber">{r.pending} pending</Badge>}
                          {r.count}
                        </span>
                      </Td>
                      <Td align="right" className="font-medium text-ink">
                        {money(r.value)}
                      </Td>
                      <Td align="right">{r.s.leadDays} days</Td>
                      <Td>{r.last ? fmtDate(r.last) : "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            );
          })()
        )}
      </Card>
    </>
  );
}
