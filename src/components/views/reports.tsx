"use client";

import { Download, Printer } from "lucide-react";
import { useMemo } from "react";
import { PERIODS, downloadCsv, inRange, livePurchases, liveSales, periodRange, salesByItem, series, sum, totalBy, type Period } from "@/lib/analytics";
import { DAY, money, moneyCompact, qty } from "@/lib/format";
import { isLow, lineTotal, purchaseTotal, saleTotal, stockStatus } from "@/lib/inventory";
import { useLookups, useStore } from "@/lib/store";
import { useUrlState } from "@/lib/use-url-state";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar, ItemThumb } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Segmented, Select } from "@/components/ui/field";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { ColumnChart } from "@/components/charts/column-chart";
import { BarList } from "@/components/charts/bar-list";
import { usePanels } from "@/components/shell/panels";
import { SummaryStrip } from "./summary-strip";

const TABS = ["stock", "sales", "purchase"] as const;
const PERIOD_VALUES = PERIODS.map((p) => p.value);
const daysOf: Record<Exclude<Period, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Days to chart: the period itself, or for "All time" the span back to the oldest document. */
function chartDays(period: Period, docs: { date: string }[], now: number) {
  if (period !== "all") return daysOf[period];
  const oldest = Math.min(now, ...docs.map((d) => new Date(d.date).getTime()));
  return Math.max(7, Math.ceil((now - oldest) / DAY) + 1);
}
const labelEvery = (days: number) => (days <= 7 ? 1 : days <= 31 ? 5 : 3);

type Report = { summary: React.ComponentProps<typeof SummaryStrip>["items"]; body: React.ReactNode; csv: () => (string | number)[][] };

export function ReportsView() {
  const [tab, setTab] = useUrlState("tab", "stock", TABS);
  const [period, setPeriod] = useUrlState<Period>("period", "30d", PERIOD_VALUES);
  const stock = useStockReport(period);
  const sales = useSalesReport(period);
  const purchase = usePurchaseReport(period);
  const report = tab === "stock" ? stock : tab === "sales" ? sales : purchase;
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  return (
    <>
      <PageHeader
        title="Reports"
        description={tab === "stock" ? "Current stock position and valuation." : `Figures for the last ${periodLabel}. Cancelled documents are excluded.`}
        actions={
          <>
            <Button onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button onClick={() => downloadCsv(`stockwise-${tab}-report-${period}.csv`, report.csv())}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Stock report" },
            { value: "sales", label: "Sales report" },
            { value: "purchase", label: "Purchase report" },
          ]}
        />
        <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} inline className="sm:ml-auto" aria-label="Period">
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {tab === "stock" ? `Sold in: ${p.label}` : p.label}
            </option>
          ))}
        </Select>
      </div>
      <SummaryStrip items={report.summary} />
      {report.body}
    </>
  );
}

/* ---------------------------------- Stock --------------------------------- */

function useStockReport(period: Period): Report {
  const { state, now } = useStore();
  const { supplier } = useLookups();
  const panels = usePanels();
  return useMemo(() => {
    const range = periodRange(period, now);
    const sold = salesByItem(liveSales(state).filter((s) => inRange(s.date, range)));
    const days = chartDays(period, liveSales(state), now);
    const rows = state.items
      .map((i) => {
        const units = sold.get(i.id)?.units ?? 0;
        return { i, value: i.qty * i.cost, sold: units, cover: units ? Math.floor(i.qty / (units / days)) : null };
      })
      .sort((a, b) => b.value - a.value);
    const value = sum(rows.map((r) => r.value));
    const retail = sum(state.items.map((i) => i.qty * i.price));
    const byCat = totalBy(state.items, (i) => i.category, (i) => i.qty * i.cost);
    const byGodown = totalBy(state.items, (i) => i.godown, (i) => i.qty * i.cost);

    return {
      summary: [
        { label: "Stock value (cost)", value: money(value), hint: `${qty(sum(state.items.map((i) => i.qty)))} units` },
        { label: "Retail value", value: money(retail), hint: "at selling price" },
        { label: "Potential margin", value: money(retail - value), tone: "green", hint: `${Math.round(((retail - value) / retail) * 100)}% of retail` },
        { label: "Below minimum", value: String(state.items.filter(isLow).length), tone: "amber", hint: `${state.items.filter((i) => i.qty <= 0).length} out of stock` },
      ],
      csv: () => [
        ["SKU", "Item", "Category", "Godown", "Supplier", "On hand", "Unit", "Min level", "Unit cost", "Stock value", "Sold in period", "Days of cover", "Status"],
        ...rows.map(({ i, value, sold, cover }) => [i.sku, i.name, i.category, i.godown, supplier.get(i.supplierId)?.name ?? "", i.qty, i.unit, i.minLevel, i.cost, value, sold, cover ?? "", stockStatus(i)]),
      ],
      body: (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Value by category" />
              <div className="px-5 pb-5">
                <BarList rows={byCat.map(([k, v]) => ({ key: k, label: k, value: v, display: moneyCompact(v), sub: `${Math.round((v / value) * 100)}%` }))} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Value by godown" />
              <div className="px-5 pb-5">
                <BarList rows={byGodown.map(([k, v]) => ({ key: k, label: k, value: v, display: moneyCompact(v), sub: `${Math.round((v / value) * 100)}%` }))} />
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Item valuation" description="Days of cover = on hand ÷ average daily sales in the selected period" />
            <Table>
              <THead>
                <Th>Item</Th>
                <Th>Godown</Th>
                <Th align="right">On hand</Th>
                <Th align="right">Unit cost</Th>
                <Th align="right">Value</Th>
                <Th align="right">Sold</Th>
                <Th align="right">Days of cover</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {rows.map(({ i, value, sold, cover }) => (
                  <Tr key={i.id} onClick={() => panels.open({ kind: "item", id: i.id })}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <ItemThumb category={i.category} size="sm" />
                        <span className="font-medium text-ink">{i.name}</span>
                        <span className="tabular text-xs text-faint">{i.sku}</span>
                      </span>
                    </Td>
                    <Td>{i.godown}</Td>
                    <Td align="right">
                      {qty(i.qty)} <span className="text-faint">{i.unit}</span>
                    </Td>
                    <Td align="right">{money(i.cost)}</Td>
                    <Td align="right" className="font-medium text-ink">
                      {money(value)}
                    </Td>
                    <Td align="right">{qty(sold)}</Td>
                    <Td align="right" className={cover !== null && cover < 7 ? "font-medium text-amber-700" : ""}>
                      {cover === null ? "—" : `${cover}d`}
                    </Td>
                    <Td>
                      <StatusBadge status={stockStatus(i)} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      ),
    };
  }, [state, now, period, supplier, panels]);
}

/* ---------------------------------- Sales --------------------------------- */

function useSalesReport(period: Period): Report {
  const { state, now } = useStore();
  const { item, customer } = useLookups();
  const panels = usePanels();
  return useMemo(() => {
    const range = periodRange(period, now);
    const sales = liveSales(state).filter((s) => inRange(s.date, range));
    const salesDays = chartDays(period, sales, now);
    const revenue = sum(sales.map(saleTotal));
    const net = sum(sales.map((s) => lineTotal(s.lines)));
    const cogs = sum(sales.flatMap((s) => s.lines.map((l) => l.qty * (item.get(l.itemId)?.cost ?? 0))));
    const byItem = [...salesByItem(sales).entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    const byCustomer = totalBy(sales, (s) => s.customerId, saleTotal);
    const byCategory = totalBy(
      sales.flatMap((s) => s.lines),
      (l) => item.get(l.itemId)?.category ?? "Other",
      (l) => l.qty * l.rate,
    );

    return {
      summary: [
        { label: "Revenue (incl. GST)", value: money(revenue), hint: `${money(net)} before tax` },
        { label: "Invoices", value: String(sales.length), hint: `avg ${money(sales.length ? revenue / sales.length : 0)}` },
        { label: "Gross margin", value: money(net - cogs), tone: "green", hint: net ? `${Math.round(((net - cogs) / net) * 100)}% of net sales` : undefined },
        { label: "Collected", value: money(sum(sales.filter((s) => s.status === "Paid").map(saleTotal))), tone: "blue", hint: `${sales.filter((s) => s.status === "Unpaid").length} still unpaid` },
      ],
      csv: () => [
        ["SKU", "Item", "Category", "Units sold", "Invoice lines", "Net revenue", "Share %"],
        ...byItem.map(([id, r]) => {
          const it = item.get(id);
          return [it?.sku ?? "", it?.name ?? "", it?.category ?? "", r.units, r.orders, r.revenue, ((r.revenue / net) * 100).toFixed(1)];
        }),
      ],
      body: (
        <>
          <Card className="mb-4">
            <CardHeader title="Revenue over time" description={salesDays > 45 ? "Weekly, incl. GST" : "Daily, incl. GST"} />
            <div className="px-4 pb-4 sm:px-5">
              <ColumnChart data={series(sales, saleTotal, salesDays, now)} format={moneyCompact} labelEvery={labelEvery(salesDays)} />
            </div>
          </Card>
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="By customer" description="Incl. GST" />
              <div className="px-5 pb-5">
                <BarList
                  rows={byCustomer.map(([id, v]) => ({
                    key: id,
                    label: customer.get(id)?.name ?? "—",
                    value: v,
                    display: moneyCompact(v),
                    onClick: () => panels.open({ kind: "customer", id }),
                  }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="By category" description="Net of GST" />
              <div className="px-5 pb-5">
                <BarList rows={byCategory.map(([k, v]) => ({ key: k, label: k, value: v, display: moneyCompact(v), sub: `${Math.round((v / net) * 100)}%` }))} />
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Item-wise sales" description="Net of GST" />
            <Table>
              <THead>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th align="right">Units</Th>
                <Th align="right">Invoice lines</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">Share</Th>
              </THead>
              <tbody>
                {byItem.map(([id, r]) => {
                  const it = item.get(id);
                  return (
                    <Tr key={id} onClick={() => panels.open({ kind: "item", id })}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          {it && <ItemThumb category={it.category} size="sm" />}
                          <span className="font-medium text-ink">{it?.name}</span>
                          <span className="tabular text-xs text-faint">{it?.sku}</span>
                        </span>
                      </Td>
                      <Td>{it?.category}</Td>
                      <Td align="right">
                        {qty(r.units)} <span className="text-faint">{it?.unit}</span>
                      </Td>
                      <Td align="right">{r.orders}</Td>
                      <Td align="right" className="font-medium text-ink">
                        {money(r.revenue)}
                      </Td>
                      <Td align="right">{((r.revenue / net) * 100).toFixed(1)}%</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      ),
    };
  }, [state, now, period, item, customer, panels]);
}

/* -------------------------------- Purchase -------------------------------- */

function usePurchaseReport(period: Period): Report {
  const { state, now } = useStore();
  const panels = usePanels();
  return useMemo(() => {
    const range = periodRange(period, now);
    const pos = livePurchases(state).filter((p) => inRange(p.date, range));
    const poDays = chartDays(period, pos, now);
    const received = pos.filter((p) => p.status === "Received");
    const pending = state.purchases.filter((p) => p.status === "Pending");
    const onTime = received.filter((p) => new Date(p.receivedDate!).getTime() <= new Date(p.expectedDate).getTime() + DAY / 2);

    const perf = state.suppliers
      .map((s) => {
        const mine = pos.filter((p) => p.supplierId === s.id);
        const rec = mine.filter((p) => p.status === "Received");
        const lead = rec.length ? sum(rec.map((p) => (new Date(p.receivedDate!).getTime() - new Date(p.date).getTime()) / DAY)) / rec.length : null;
        const ontime = rec.filter((p) => new Date(p.receivedDate!).getTime() <= new Date(p.expectedDate).getTime() + DAY / 2).length;
        return { s, orders: mine.length, value: sum(mine.map(purchaseTotal)), lead, ontime: rec.length ? Math.round((ontime / rec.length) * 100) : null, pending: mine.filter((p) => p.status === "Pending").length };
      })
      .sort((a, b) => b.value - a.value);

    return {
      summary: [
        { label: "Purchased (incl. GST)", value: money(sum(pos.map(purchaseTotal))), hint: `${pos.length} orders` },
        { label: "Received", value: money(sum(received.map(purchaseTotal))), tone: "green", hint: `${received.length} orders` },
        { label: "Pending now", value: money(sum(pending.map(purchaseTotal))), tone: "amber", hint: `${pending.length} orders on the way` },
        { label: "On-time delivery", value: received.length ? `${Math.round((onTime.length / received.length) * 100)}%` : "—", hint: `${onTime.length} of ${received.length} received` },
      ],
      csv: () => [
        ["Supplier", "City", "Orders", "Value (incl. GST)", "Pending orders", "Avg lead days", "On-time %"],
        ...perf.map((r) => [r.s.name, r.s.city, r.orders, r.value, r.pending, r.lead?.toFixed(1) ?? "", r.ontime ?? ""]),
      ],
      body: (
        <>
          <Card className="mb-4">
            <CardHeader title="Purchases over time" description={poDays > 45 ? "Weekly, by order date, incl. GST" : "Daily, by order date, incl. GST"} />
            <div className="px-4 pb-4 sm:px-5">
              <ColumnChart data={series(pos, purchaseTotal, poDays, now)} format={moneyCompact} labelEvery={labelEvery(poDays)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Supplier performance" description="Lead time is order date to receipt" />
            <Table>
              <THead>
                <Th>Supplier</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Pending</Th>
                <Th align="right">Value</Th>
                <Th align="right">Avg lead time</Th>
                <Th align="right">Quoted</Th>
                <Th align="right">On time</Th>
              </THead>
              <tbody>
                {perf.map((r) => (
                  <Tr key={r.s.id} onClick={() => panels.open({ kind: "supplier", id: r.s.id })}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.s.name} />
                        <div>
                          <div className="font-medium text-ink">{r.s.name}</div>
                          <div className="text-xs text-muted">{r.s.city}</div>
                        </div>
                      </div>
                    </Td>
                    <Td align="right">{r.orders}</Td>
                    <Td align="right">{r.pending || "—"}</Td>
                    <Td align="right" className="font-medium text-ink">
                      {money(r.value)}
                    </Td>
                    <Td align="right">{r.lead === null ? "—" : `${r.lead.toFixed(1)} days`}</Td>
                    <Td align="right" className="text-muted">
                      {r.s.leadDays} days
                    </Td>
                    <Td align="right" className={r.ontime !== null && r.ontime < 80 ? "font-medium text-amber-700" : ""}>
                      {r.ontime === null ? "—" : `${r.ontime}%`}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      ),
    };
  }, [state, now, period, panels]);
}
