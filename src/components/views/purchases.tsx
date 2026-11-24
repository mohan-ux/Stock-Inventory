"use client";

import { PackageCheck, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { PERIODS, inRange, periodRange, sum, type Period } from "@/lib/analytics";
import { fmtDate, money, qty } from "@/lib/format";
import { purchaseDisplayStatus, purchaseTotal, unitsOf, type PurchaseDisplayStatus } from "@/lib/inventory";
import { useLookups, useStore } from "@/lib/store";
import { useUrlState } from "@/lib/use-url-state";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SearchInput, Segmented, Select } from "@/components/ui/field";
import { SortTh, THead, Table, Td, Th, Tr, useSort } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { usePanels } from "@/components/shell/panels";
import { SummaryStrip } from "./summary-strip";
import { TableFooter } from "./sales";

const STATUS = ["all", "pending", "late", "received", "cancelled"] as const;
type StatusFilter = (typeof STATUS)[number];
const PERIOD_VALUES = PERIODS.map((p) => p.value);

export function PurchasesView() {
  const { state, dispatch } = useStore();
  const { supplier, item } = useLookups();
  const panels = usePanels();
  const toast = useToast();
  const [status, setStatus] = useUrlState<StatusFilter>("status", "all", STATUS);
  const [period, setPeriod] = useUrlState<Period>("period", "90d", PERIOD_VALUES);
  const [supplierId, setSupplierId] = useState("");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const range = periodRange(period);
    return state.purchases
      .filter((p) => inRange(p.date, range) || p.status === "Pending")
      .map((p) => ({
        p,
        status: purchaseDisplayStatus(p),
        total: purchaseTotal(p),
        supplier: supplier.get(p.supplierId)?.name ?? "—",
        items: p.lines.map((l) => item.get(l.itemId)?.name ?? "").join(", "),
      }));
  }, [state.purchases, period, supplier, item]);

  const matches = (st: PurchaseDisplayStatus, f: StatusFilter) => f === "all" || st.toLowerCase() === f || (f === "pending" && st === "Late");
  const filtered = rows.filter((r) => {
    if (!matches(r.status, status)) return false;
    if (supplierId && r.p.supplierId !== supplierId) return false;
    const term = q.trim().toLowerCase();
    return !term || [r.p.number, r.supplier, r.items].some((v) => v.toLowerCase().includes(term));
  });
  const { sorted, sort, onSort } = useSort(
    filtered,
    (r, k: "date" | "number" | "supplier" | "expected" | "total") =>
      k === "date" ? r.p.date : k === "expected" ? r.p.expectedDate : k === "total" ? r.total : k === "number" ? r.p.number : r.supplier,
    { key: "date", dir: -1 },
  );

  const count = (f: StatusFilter) => rows.filter((r) => matches(r.status, f)).length;
  const pending = rows.filter((r) => r.p.status === "Pending");
  const received = rows.filter((r) => r.p.status === "Received");

  const receive = (id: string, number: string, units: number) => {
    const r = dispatch({ type: "purchase/receive", id });
    if (r.ok) toast({ title: `${number} received`, description: `${qty(units)} units added to stock.`, action: { label: "View stock", href: "/stock" } });
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Orders placed with suppliers. Stock increases only when an order is marked received."
        actions={
          <Button variant="primary" onClick={() => panels.open({ kind: "newPurchase" })}>
            <Plus /> New purchase order
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Received", value: money(sum(received.map((r) => r.total))), tone: "green", hint: `${received.length} orders in period` },
          { label: "Pending", value: money(sum(pending.map((r) => r.total))), tone: "amber", hint: `${pending.length} orders on the way` },
          { label: "Late", value: String(count("late")), tone: "red", hint: "past expected date" },
          {
            label: "Units on order",
            value: qty(sum(pending.map((r) => unitsOf(r.p.lines)))),
            hint: `${new Set(pending.flatMap((r) => r.p.lines.map((l) => l.itemId))).size} items`,
          },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: count("all") },
              { value: "pending", label: "Pending", count: count("pending") },
              { value: "late", label: "Late", count: count("late") },
              { value: "received", label: "Received", count: count("received") },
              { value: "cancelled", label: "Cancelled", count: count("cancelled") },
            ]}
          />
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <SearchInput value={q} onChange={setQ} placeholder="PO, supplier or item" className="min-w-0 flex-1 sm:w-56 sm:flex-none" />
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} inline aria-label="Supplier">
              <option value="">All suppliers</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} inline aria-label="Period">
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <EmptyState icon={<Truck />} title="No purchase orders match">
            Try a different status, period or search.
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <SortTh k="number" sort={sort} onSort={onSort}>PO</SortTh>
              <SortTh k="supplier" sort={sort} onSort={onSort}>Supplier</SortTh>
              <SortTh k="date" sort={sort} onSort={onSort}>Ordered</SortTh>
              <SortTh k="expected" sort={sort} onSort={onSort}>Expected / received</SortTh>
              <SortTh k="total" sort={sort} onSort={onSort} align="right">Amount</SortTh>
              <Th>Status</Th>
              <Th align="right"><span className="sr-only">Actions</span></Th>
            </THead>
            <tbody>
              {sorted.map(({ p, status, total, supplier, items }) => (
                <Tr key={p.id} onClick={() => panels.open({ kind: "purchase", id: p.id })}>
                  <Td className="tabular text-[13px] font-medium text-ink">{p.number}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={supplier} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{supplier}</div>
                        <div className="max-w-64 truncate text-xs text-muted">
                          {items} · {qty(unitsOf(p.lines))} units
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>{fmtDate(p.date)}</Td>
                  <Td className={status === "Late" ? "font-medium text-rose-600" : ""}>
                    {p.status === "Cancelled" ? "—" : fmtDate(p.receivedDate ?? p.expectedDate)}
                  </Td>
                  <Td align="right" className={p.status === "Cancelled" ? "text-faint line-through" : "font-medium text-ink"}>
                    {money(total)}
                  </Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                  <Td align="right">
                    {p.status === "Pending" && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          receive(p.id, p.number, unitsOf(p.lines));
                        }}
                      >
                        <PackageCheck /> Receive
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <TableFooter shown={sorted.length} total={rows.length} label="orders" />
      </Card>
    </>
  );
}
