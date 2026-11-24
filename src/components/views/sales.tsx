"use client";

import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PERIODS, inRange, periodRange, sum, type Period } from "@/lib/analytics";
import { fmtDate, money, qty } from "@/lib/format";
import { saleDisplayStatus, saleTotal, unitsOf, type SaleDisplayStatus } from "@/lib/inventory";
import { useLookups, useStore } from "@/lib/store";
import { useUrlState } from "@/lib/use-url-state";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SearchInput, Segmented, Select } from "@/components/ui/field";
import { SortTh, THead, Table, Td, Th, Tr, useSort } from "@/components/ui/table";
import { usePanels } from "@/components/shell/panels";
import { SummaryStrip } from "./summary-strip";

const STATUS = ["all", "unpaid", "overdue", "paid", "cancelled"] as const;
type StatusFilter = (typeof STATUS)[number];
const PERIOD_VALUES = PERIODS.map((p) => p.value);

export function SalesView() {
  const { state } = useStore();
  const { customer } = useLookups();
  const panels = usePanels();
  const [status, setStatus] = useUrlState<StatusFilter>("status", "all", STATUS);
  const [period, setPeriod] = useUrlState<Period>("period", "90d", PERIOD_VALUES);
  const [customerId, setCustomerId] = useState("");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const range = periodRange(period);
    return state.sales
      .filter((s) => inRange(s.date, range))
      .map((s) => ({ s, status: saleDisplayStatus(s), total: saleTotal(s), customer: customer.get(s.customerId)?.name ?? "—" }));
  }, [state.sales, period, customer]);

  const matches = (st: SaleDisplayStatus, f: StatusFilter) => f === "all" || st.toLowerCase() === f || (f === "unpaid" && st === "Overdue");
  const filtered = rows.filter((r) => {
    if (!matches(r.status, status)) return false;
    if (customerId && r.s.customerId !== customerId) return false;
    const term = q.trim().toLowerCase();
    return !term || r.s.number.toLowerCase().includes(term) || r.customer.toLowerCase().includes(term);
  });

  const { sorted, sort, onSort } = useSort(
    filtered,
    (r, k: "date" | "number" | "customer" | "due" | "total") =>
      k === "date" ? r.s.date : k === "due" ? r.s.dueDate : k === "total" ? r.total : k === "number" ? r.s.number : r.customer,
    { key: "date", dir: -1 },
  );

  const live = rows.filter((r) => r.status !== "Cancelled");
  const count = (f: StatusFilter) => rows.filter((r) => matches(r.status, f)).length;

  return (
    <>
      <PageHeader
        title="Sales"
        description="Invoices raised to customers. Creating an invoice deducts stock; cancelling returns it."
        actions={
          <Button variant="primary" onClick={() => panels.open({ kind: "newSale" })}>
            <Plus /> New invoice
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Invoiced", value: money(sum(live.map((r) => r.total))), hint: `${live.length} invoices` },
          { label: "Collected", value: money(sum(live.filter((r) => r.status === "Paid").map((r) => r.total))), tone: "green" },
          { label: "Outstanding", value: money(sum(live.filter((r) => r.status === "Unpaid").map((r) => r.total))), tone: "blue" },
          { label: "Overdue", value: money(sum(live.filter((r) => r.status === "Overdue").map((r) => r.total))), tone: "red", hint: `${count("overdue")} invoices` },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: count("all") },
              { value: "unpaid", label: "Unpaid", count: count("unpaid") },
              { value: "overdue", label: "Overdue", count: count("overdue") },
              { value: "paid", label: "Paid", count: count("paid") },
              { value: "cancelled", label: "Cancelled", count: count("cancelled") },
            ]}
          />
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <SearchInput value={q} onChange={setQ} placeholder="Invoice or customer" className="min-w-0 flex-1 sm:w-56 sm:flex-none" />
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} inline aria-label="Customer">
              <option value="">All customers</option>
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <EmptyState icon={<FileText />} title="No invoices match">
            Try a different status, period or search.
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <SortTh k="number" sort={sort} onSort={onSort}>Invoice</SortTh>
              <SortTh k="customer" sort={sort} onSort={onSort}>Customer</SortTh>
              <SortTh k="date" sort={sort} onSort={onSort}>Date</SortTh>
              <SortTh k="due" sort={sort} onSort={onSort}>Due</SortTh>
              <Th align="right">Items</Th>
              <SortTh k="total" sort={sort} onSort={onSort} align="right">Amount</SortTh>
              <Th>Status</Th>
            </THead>
            <tbody>
              {sorted.map(({ s, status, total, customer }) => (
                <Tr key={s.id} onClick={() => panels.open({ kind: "sale", id: s.id })}>
                  <Td className="tabular text-[13px] font-medium text-ink">{s.number}</Td>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={customer} size="sm" />
                      <span className="font-medium text-ink">{customer}</span>
                    </span>
                  </Td>
                  <Td>{fmtDate(s.date)}</Td>
                  <Td className={status === "Overdue" ? "font-medium text-rose-600" : ""}>{s.status === "Unpaid" ? fmtDate(s.dueDate) : "—"}</Td>
                  <Td align="right">
                    {s.lines.length} <span className="text-faint">· {qty(unitsOf(s.lines))} u</span>
                  </Td>
                  <Td align="right" className={s.status === "Cancelled" ? "text-faint line-through" : "font-medium text-ink"}>
                    {money(total)}
                  </Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <TableFooter shown={sorted.length} total={rows.length} label="invoices" />
      </Card>
    </>
  );
}

export function TableFooter({ shown, total, label }: { shown: number; total: number; label: string }) {
  return (
    <div className="border-t border-line px-5 py-3 text-xs text-muted">
      Showing {shown} of {total} {label} in this period
    </div>
  );
}
