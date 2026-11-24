"use client";

import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Boxes,
  CircleDollarSign,
  FileText,
  IndianRupee,
  PackageCheck,
  PackagePlus,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { DAY, fmtShort, money, moneyCompact, pctChange, qty, timeAgo } from "@/lib/format";
import { incomingByItem, isLow, lineTotal, purchaseDisplayStatus, purchaseTotal, saleDisplayStatus, saleTotal, suggestedReorder, unitsOf } from "@/lib/inventory";
import { inRange, livePurchases, liveSales, rollingAverage, salesByItem, startOfDay, sum } from "@/lib/analytics";
import { useLookups, useStore } from "@/lib/store";
import type { Activity, ActivityKind } from "@/lib/types";
import { Avatar, ItemThumb } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Delta, EmptyState, LevelMeter, Stat } from "@/components/ui/card";
import { Segmented } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { AreaChart } from "@/components/charts/area-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { usePanels } from "@/components/shell/panels";

export function Dashboard() {
  const { state, now, dispatch } = useStore();
  const { item, supplier } = useLookups();
  const panels = usePanels();
  const toast = useToast();
  const [chart, setChart] = useState<"sales" | "purchases">("sales");

  const d = useMemo(() => {
    const today = { from: startOfDay(now), to: now + 1 };
    const cur = { from: startOfDay(now) - 29 * DAY, to: now + 1 };
    const prev = { from: cur.from - 30 * DAY, to: cur.from };
    const sales = liveSales(state);
    const purchases = livePurchases(state);
    const salesCur = sales.filter((s) => inRange(s.date, cur));
    const salesPrev = sales.filter((s) => inRange(s.date, prev));
    const salesToday = sales.filter((s) => inRange(s.date, today));
    const profit = (list: typeof sales) => sum(list.map((s) => lineTotal(s.lines) - sum(s.lines.map((l) => l.qty * (item.get(l.itemId)?.cost ?? 0)))));
    const unpaid = state.sales.filter((s) => s.status === "Unpaid");
    const overdue = unpaid.filter((s) => saleDisplayStatus(s, now) === "Overdue");
    const incoming = incomingByItem(state);
    const low = state.items.filter(isLow).sort((a, b) => a.qty / Math.max(a.minLevel, 1) - b.qty / Math.max(b.minLevel, 1));
    const pending = state.purchases.filter((p) => p.status === "Pending").sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
    const value = (g?: string) => sum(state.items.filter((i) => !g || i.godown === g).map((i) => i.qty * i.cost));
    // Daily totals are spiky (Sundays are zero), so trends use a 7-day rolling
    // average; the tooltip still shows the actual day's total.
    const purchasesCur = purchases.filter((p) => inRange(p.date, cur));
    const purchasesPrev = purchases.filter((p) => inRange(p.date, prev));

    return {
      today: { revenue: sum(salesToday.map(saleTotal)), count: salesToday.length, units: sum(salesToday.map((s) => unitsOf(s.lines))) },
      revenue: sum(salesCur.map(saleTotal)),
      revenueDelta: pctChange(sum(salesCur.map(saleTotal)), sum(salesPrev.map(saleTotal))),
      invoices: salesCur.length,
      profit: profit(salesCur),
      profitDelta: pctChange(profit(salesCur), profit(salesPrev)),
      receivable: sum(unpaid.map(saleTotal)),
      overdue,
      overdueValue: sum(overdue.map(saleTotal)),
      stockValue: value(),
      chennaiValue: value("Chennai Main"),
      units: sum(state.items.map((i) => i.qty)),
      low,
      out: low.filter((i) => i.qty <= 0).length,
      incoming,
      pending,
      late: pending.filter((p) => purchaseDisplayStatus(p, now) === "Late").length,
      top: [...salesByItem(salesCur).entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5),
      daily: rollingAverage(sales, saleTotal, now, moneyCompact),
      dailyProfit: rollingAverage(sales, (s) => profit([s]), now, moneyCompact),
      salesPrev: rollingAverage(sales, saleTotal, cur.from - 1, moneyCompact),
      purchases: rollingAverage(purchases, purchaseTotal, now, moneyCompact),
      purchasesPrev: rollingAverage(purchases, purchaseTotal, cur.from - 1, moneyCompact),
      purchaseTotal: sum(purchasesCur.map(purchaseTotal)),
      purchaseDelta: pctChange(sum(purchasesCur.map(purchaseTotal)), sum(purchasesPrev.map(purchaseTotal))),
    };
  }, [state, now, item]);

  const chartData = chart === "sales" ? d.daily : d.purchases;
  const chartPrev = chart === "sales" ? d.salesPrev : d.purchasesPrev;
  const chartTotal = chart === "sales" ? d.revenue : d.purchaseTotal;
  const chartDelta = chart === "sales" ? d.revenueDelta : d.purchaseDelta;
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const receive = (id: string, number: string, units: number) => {
    const r = dispatch({ type: "purchase/receive", id });
    if (r.ok) toast({ title: `${number} received`, description: `${qty(units)} units added to stock.`, action: { label: "View stock", href: "/stock" } });
  };

  return (
    <>
      {/* Hero: today at a glance, plus what needs attention */}
      <section className="relative mb-5 overflow-hidden rounded-2xl bg-[#0d1226] px-5 py-6 text-white shadow-lift sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_85%_-40px,rgb(99_102_241/0.55),transparent_70%),radial-gradient(500px_220px_at_0%_120%,rgb(56_189_248/0.18),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium text-indigo-200/80">
              {new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">{greeting}</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
              {d.today.count ? (
                <>
                  <span className="tabular font-semibold text-white">{money(d.today.revenue)}</span> invoiced today across {d.today.count} {d.today.count === 1 ? "order" : "orders"} ·{" "}
                  {qty(d.today.units)} units dispatched.
                </>
              ) : (
                "No invoices yet today. Here's where your business stands."
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:w-[620px]">
            <HeroTile href="/sales?status=overdue" icon={<Wallet />} tone="rose" label="Overdue payments" value={moneyCompact(d.overdueValue)} detail={`${d.overdue.length} invoices to chase`} />
            <HeroTile href="/stock?status=low" icon={<AlertTriangle />} tone="amber" label="Low stock" value={`${d.low.length} items`} detail={`${d.out} out of stock · ${d.low.filter((i) => d.incoming.get(i.id)).length} on order`} />
            <HeroTile href="/purchases?status=pending" icon={<Truck />} tone="sky" label="Deliveries due" value={`${d.pending.length} orders`} detail={d.late ? `${d.late} running late` : "All on schedule"} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue · 30 days"
          value={moneyCompact(d.revenue)}
          icon={<IndianRupee />}
          href="/reports?tab=sales"
          delta={<Delta value={d.revenueDelta} />}
          hint={`${d.invoices} invoices · vs previous 30 days`}
          chart={<Sparkline values={d.daily.map((p) => p.value)} className="h-full w-full" tone={d.revenueDelta >= 0 ? "brand" : "red"} />}
        />
        <Stat
          label="Gross profit · 30 days"
          value={moneyCompact(d.profit)}
          icon={<TrendingUp />}
          href="/reports?tab=sales"
          delta={<Delta value={d.profitDelta} />}
          hint={`${d.revenue ? Math.round((d.profit / (d.revenue / 1.18)) * 100) : 0}% margin on net sales`}
          chart={<Sparkline values={d.dailyProfit.map((p) => p.value)} className="h-full w-full" tone={d.profitDelta >= 0 ? "green" : "red"} />}
        />
        <Stat
          label="Receivables"
          value={moneyCompact(d.receivable)}
          icon={<Wallet />}
          href="/sales?status=unpaid"
          hint={
            <div>
              <SplitBar parts={[{ value: d.overdueValue, cls: "bg-rose-500" }, { value: d.receivable - d.overdueValue, cls: "bg-slate-300" }]} />
              <p className="mt-2">
                <span className="font-medium text-rose-600">{moneyCompact(d.overdueValue)} overdue</span> · {moneyCompact(d.receivable - d.overdueValue)} not yet due
              </p>
            </div>
          }
        />
        <Stat
          label="Stock value"
          value={moneyCompact(d.stockValue)}
          icon={<Boxes />}
          href="/stock"
          hint={
            <div>
              <SplitBar parts={[{ value: d.chennaiValue, cls: "bg-brand-500" }, { value: d.stockValue - d.chennaiValue, cls: "bg-sky-400" }]} />
              <p className="mt-2 flex flex-wrap gap-x-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-brand-500" />
                  Chennai {Math.round((d.chennaiValue / Math.max(d.stockValue, 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  Coimbatore {Math.round(((d.stockValue - d.chennaiValue) / Math.max(d.stockValue, 1)) * 100)}%
                </span>
              </p>
            </div>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                {chart === "sales" ? "Sales trend" : "Purchase trend"}
              </span>
            }
            description={
              <span className="flex flex-wrap items-center gap-2">
                <span className="tabular text-xl font-semibold tracking-tight text-ink">{money(chartTotal)}</span>
                <Delta value={chartDelta} goodWhenUp={chart === "sales"} />
                <span>last 30 days, incl. GST · chart shows 7-day average</span>
              </span>
            }
            action={
              <Segmented
                value={chart}
                onChange={setChart}
                options={[
                  { value: "sales", label: "Sales" },
                  { value: "purchases", label: "Purchases" },
                ]}
              />
            }
          />
          <div className="px-3 pt-1 pb-4 sm:px-5">
            <AreaChart data={chartData} compare={chartPrev} format={moneyCompact} labelEvery={5} height={250} seriesLabel="Last 30 days" compareLabel="Previous 30 days" />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Low stock"
            description="At or below minimum level"
            action={
              <Link href="/stock?status=low" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {d.low.length === 0 ? (
            <EmptyState icon={<PackageCheck />} title="All items are above minimum" />
          ) : (
            <ul className="flex-1 space-y-1 px-3 pb-3">
              {d.low.slice(0, 5).map((i) => {
                const incoming = d.incoming.get(i.id) ?? 0;
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-canvas">
                    <ItemThumb category={i.category} />
                    <button type="button" onClick={() => panels.open({ kind: "item", id: i.id })} className="min-w-0 flex-1 text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{i.name}</span>
                        <span className="tabular shrink-0 text-xs text-muted">
                          <span className={cn("font-semibold", i.qty <= 0 ? "text-rose-600" : "text-amber-700")}>{qty(i.qty)}</span>/{qty(i.minLevel)}
                        </span>
                      </div>
                      <LevelMeter qty={i.qty} min={i.minLevel} className="mt-2" />
                    </button>
                    {incoming ? (
                      <Badge tone="green" className="w-[72px] justify-center" dot={false}>
                        +{qty(incoming)} due
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="w-[72px]"
                        onClick={() => panels.open({ kind: "newPurchase", supplierId: i.supplierId, lines: [{ itemId: i.id, qty: suggestedReorder(i), rate: i.cost }] })}
                      >
                        Reorder
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Recent activity" description="Every change to stock and money" />
          <ActivityFeed items={state.activity.slice(0, 8)} now={now} />
        </Card>

        <Card>
          <CardHeader
            title="Pending deliveries"
            description={`${d.pending.length} purchase orders on the way`}
            action={
              <Link href="/purchases?status=pending" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {d.pending.length === 0 ? (
            <EmptyState icon={<Truck />} title="No orders on the way" />
          ) : (
            <ul className="space-y-1 px-3 pb-3">
              {d.pending.slice(0, 5).map((p) => {
                const late = purchaseDisplayStatus(p, now) === "Late";
                const days = Math.round((new Date(p.expectedDate).getTime() - now) / DAY);
                const sup = supplier.get(p.supplierId);
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-canvas">
                    <Avatar name={sup?.name ?? "?"} />
                    <button type="button" onClick={() => panels.open({ kind: "purchase", id: p.id })} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[13px] font-medium text-ink">{p.number}</span>
                        <Badge tone={late ? "red" : days <= 1 ? "amber" : "gray"}>
                          {late ? `${Math.abs(days)}d late` : days <= 0 ? "Due today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {sup?.name} · {p.lines.map((l) => item.get(l.itemId)?.name).join(", ")}
                      </p>
                    </button>
                    <Button size="sm" onClick={() => receive(p.id, p.number, unitsOf(p.lines))}>
                      <PackageCheck /> Receive
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Top sellers" description="By revenue, last 30 days (excl. GST)" />
          <ol className="space-y-1 px-3 pb-3">
            {d.top.map(([id, r], idx) => {
              const it = item.get(id);
              if (!it) return null;
              const pct = (r.revenue / d.top[0][1].revenue) * 100;
              return (
                <li key={id}>
                  <button type="button" onClick={() => panels.open({ kind: "item", id })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-canvas">
                    <span className="tabular w-4 text-center text-xs font-semibold text-faint">{idx + 1}</span>
                    <ItemThumb category={it.category} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{it.name}</span>
                        <span className="tabular shrink-0 text-[13px] font-semibold text-ink">{moneyCompact(r.revenue)}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="h-1 flex-1 rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-400" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="tabular w-14 text-right text-[11px] text-muted">
                          {qty(r.units)} {it.unit}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </>
  );
}

function HeroTile({ href, icon, tone, label, value, detail }: { href: string; icon: React.ReactNode; tone: "rose" | "amber" | "sky"; label: string; value: string; detail: string }) {
  const iconCls = { rose: "bg-rose-400/15 text-rose-300", amber: "bg-amber-400/15 text-amber-300", sky: "bg-sky-400/15 text-sky-300" }[tone];
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.09] sm:p-3.5"
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex size-7 items-center justify-center rounded-lg [&_svg]:size-3.5", iconCls)}>{icon}</span>
        <ArrowRight className="hidden size-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300 sm:block" />
      </div>
      <p className="mt-2.5 truncate text-[11px] text-slate-400 sm:mt-3 sm:text-xs">{label}</p>
      <p className="tabular mt-0.5 truncate text-[15px] font-semibold tracking-tight text-white sm:text-lg">{value}</p>
      <p className="mt-0.5 hidden truncate text-xs text-slate-400 sm:block">{detail}</p>
    </Link>
  );
}

/** Two-part proportion bar with a 2px gap between segments. */
function SplitBar({ parts }: { parts: { value: number; cls: string }[] }) {
  const total = Math.max(sum(parts.map((p) => p.value)), 1);
  return (
    <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
      {parts.map((p, i) => (
        <div key={i} className={cn("h-full first:rounded-l-full last:rounded-r-full", p.cls)} style={{ width: `${(p.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

const activityStyle: Record<ActivityKind, { icon: React.ElementType; cls: string }> = {
  sale: { icon: FileText, cls: "bg-sky-50 text-sky-600 ring-sky-100" },
  payment: { icon: CircleDollarSign, cls: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  purchase: { icon: Truck, cls: "bg-brand-50 text-brand-600 ring-brand-100" },
  receive: { icon: PackageCheck, cls: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  cancel: { icon: Ban, cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  adjust: { icon: SlidersHorizontal, cls: "bg-amber-50 text-amber-600 ring-amber-100" },
  item: { icon: PackagePlus, cls: "bg-brand-50 text-brand-600 ring-brand-100" },
};

/** Activity grouped under Today / Yesterday / a date. */
function ActivityFeed({ items, now }: { items: Activity[]; now: number }) {
  const dayLabel = (iso: string) => {
    const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso).getTime())) / DAY);
    return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : fmtShort(iso);
  };
  const groups: { label: string; items: Activity[] }[] = [];
  for (const a of items) {
    const label = dayLabel(a.date);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1)!.items.push(a);
  }
  return (
    <div className="px-5 pb-4">
      {groups.map((g) => (
        <div key={g.label} className="mb-3 last:mb-0">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">{g.label}</p>
          <ul className="space-y-3">
            {g.items.map((a) => {
              const { icon: Icon, cls } = activityStyle[a.kind];
              return (
                <li key={a.id} className="flex gap-3">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", cls)}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{a.title}</p>
                    <p className="truncate text-xs text-muted">{a.detail}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[11px] text-faint">{timeAgo(a.date, now)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
