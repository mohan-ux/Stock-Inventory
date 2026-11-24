"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  Menu,
  PackagePlus,
  PackageX,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { isLow, purchaseDisplayStatus, saleDisplayStatus, saleTotal } from "@/lib/inventory";
import { useStore } from "@/lib/store";
import { Button, IconButton } from "@/components/ui/button";
import { usePanels } from "./panels";
import { CommandPalette } from "./command-palette";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: "overdue" | "pending" | "low" };

const NAV: { title: string; items: NavItem[] }[] = [
  { title: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Operations",
    items: [
      { href: "/sales", label: "Sales", icon: ShoppingCart, badge: "overdue" },
      { href: "/purchases", label: "Purchases", icon: Truck, badge: "pending" },
      { href: "/stock", label: "Stock", icon: Boxes, badge: "low" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/contacts", label: "Contacts", icon: Users },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell flex min-h-screen">
      {/* Sidebar: fixed on desktop, slide-over on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-nav bg-gradient-to-b from-nav-2 to-nav text-nav-text transition-transform duration-200 lg:translate-x-0",
          navOpen ? "translate-x-0 shadow-pop" : "-translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-950/40 backdrop-blur-[1px] lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[252px]">
        <Topbar onMenu={() => setNavOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main className="mx-auto w-full max-w-[1360px] flex-1 animate-page-in px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Logo({ dark }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-400 via-brand-500 to-brand-700 text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset,0_6px_16px_-4px_rgb(99_102_241/0.6)]">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" />
          <path d="m4 13 8 4.5 8-4.5" opacity=".65" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-semibold tracking-tight", dark ? "text-white" : "text-ink")}>Stockwise</span>
        {dark && <span className="block text-[11px] text-nav-faint">Inventory · 2 godowns</span>}
      </span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { state, now, reset } = useStore();
  const panels = usePanels();
  const [confirmReset, setConfirmReset] = useState(false);

  const counts = {
    overdue: state.sales.filter((s) => saleDisplayStatus(s, now) === "Overdue").length,
    pending: state.purchases.filter((p) => p.status === "Pending").length,
    low: state.items.filter(isLow).length,
  };
  const late = state.purchases.some((p) => purchaseDisplayStatus(p, now) === "Late");

  return (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <Logo dark />
        <button type="button" aria-label="Close menu" onClick={onNavigate} className="rounded-lg p-1.5 text-nav-text hover:bg-white/5 hover:text-white lg:hidden">
          <X className="size-4" />
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-6 overflow-y-auto px-3">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10.5px] font-semibold tracking-[0.08em] text-nav-faint uppercase">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((n) => {
                const active = isActive(pathname, n.href);
                const count = n.badge ? counts[n.badge] : 0;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                      active ? "bg-white/[0.08] text-white" : "text-nav-text hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    {active && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-indigo-400" />}
                    <n.icon className={cn("size-[17px]", active ? "text-indigo-300" : "text-nav-faint group-hover:text-nav-text")} />
                    {n.label}
                    {count > 0 && (
                      <span
                        title={n.badge === "overdue" ? "Overdue invoices" : n.badge === "pending" ? "Orders on the way" : "Items at or below minimum"}
                        className={cn(
                          "tabular ml-auto min-w-5 rounded-md px-1.5 text-center text-[11px] leading-5 font-semibold",
                          n.badge === "pending" && !late
                            ? "bg-white/10 text-nav-text"
                            : n.badge === "low"
                              ? "bg-amber-400/15 text-amber-300"
                              : "bg-rose-400/15 text-rose-300",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-nav-line bg-white/[0.03] p-3.5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-white">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Demo workspace
        </div>
        <p className="mt-1 text-xs leading-relaxed text-nav-faint">Sample data · your changes are saved in this browser.</p>
        <button
          type="button"
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            reset();
            panels.close();
            setConfirmReset(false);
          }}
          onBlur={() => setConfirmReset(false)}
          className={cn("mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium", confirmReset ? "text-rose-300" : "text-indigo-300 hover:text-indigo-200")}
        >
          <RotateCcw className="size-3.5" />
          {confirmReset ? "Click again to reset" : "Reset sample data"}
        </button>
      </div>
      <div className="flex items-center gap-3 border-t border-nav-line px-5 py-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[11px] font-semibold text-white ring-2 ring-white/10">SM</span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-medium text-white">Store Manager</p>
          <p className="truncate text-[11px] text-nav-faint">Chennai Main</p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const page = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))).find((i) => isActive(pathname, i.href));

  return (
    <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-canvas/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-10">
        <IconButton label="Open menu" onClick={onMenu} className="-ml-1.5 lg:hidden">
          <Menu />
        </IconButton>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="hidden text-muted sm:inline">{page?.group ?? "Workspace"}</span>
          <ChevronRight className="hidden size-3.5 text-faint sm:block" />
          <span className="truncate font-medium text-ink">{page?.label ?? "Stockwise"}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-line bg-surface/80 px-3 text-[13px] text-faint shadow-card transition-colors hover:border-line-strong hover:text-muted md:flex"
          >
            <Search className="size-4" />
            Search anything…
            <kbd className="ml-auto rounded-md border border-line bg-canvas px-1.5 py-px font-sans text-[11px] text-muted">Ctrl K</kbd>
          </button>
          <IconButton label="Search" onClick={onSearch} className="md:hidden">
            <Search />
          </IconButton>
          <Alerts />
          <CreateMenu />
        </div>
      </div>
    </header>
  );
}

function Alerts() {
  const { state, now } = useStore();
  const { open, setOpen, ref } = usePopover();
  const overdue = state.sales.filter((s) => saleDisplayStatus(s, now) === "Overdue");
  const low = state.items.filter((i) => isLow(i) && i.qty > 0);
  const out = state.items.filter((i) => i.qty <= 0);
  const late = state.purchases.filter((p) => purchaseDisplayStatus(p, now) === "Late");

  const alerts = [
    out.length && { href: "/stock?status=out", icon: PackageX, tone: "bg-rose-50 text-rose-600", title: `${out.length} item${out.length > 1 ? "s" : ""} out of stock`, detail: out.map((i) => i.name).join(", ") },
    overdue.length && { href: "/sales?status=overdue", icon: Wallet, tone: "bg-rose-50 text-rose-600", title: `${overdue.length} overdue invoices`, detail: `${money(overdue.reduce((s, x) => s + saleTotal(x), 0))} to collect` },
    low.length && { href: "/stock?status=low", icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", title: `${low.length} items running low`, detail: low.map((i) => i.name).slice(0, 3).join(", ") + (low.length > 3 ? "…" : "") },
    late.length && { href: "/purchases?status=late", icon: Clock, tone: "bg-amber-50 text-amber-600", title: `${late.length} late deliver${late.length > 1 ? "ies" : "y"}`, detail: late.map((p) => p.number).join(", ") },
  ].filter(Boolean) as { href: string; icon: React.ElementType; tone: string; title: string; detail: string }[];

  return (
    <div ref={ref} className="relative">
      <IconButton label="Alerts" onClick={() => setOpen(!open)} className={cn("relative", open && "bg-ink/[0.05] text-ink")}>
        <Bell />
        {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-canvas" />}
      </IconButton>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] origin-top-right animate-pop-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Needs attention</p>
            <span className="tabular rounded-full bg-canvas px-2 text-xs font-medium text-muted">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">All clear — nothing needs attention.</p>
          ) : (
            <ul className="p-1.5">
              {alerts.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-canvas">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", a.tone)}>
                      <a.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{a.title}</span>
                      <span className="block truncate text-xs text-muted">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CreateMenu() {
  const panels = usePanels();
  const { open, setOpen, ref } = usePopover();
  const items = [
    { label: "New invoice", detail: "Sell to a customer · deducts stock", icon: FileText, run: () => panels.open({ kind: "newSale" }) },
    { label: "New purchase order", detail: "Order from a supplier", icon: Truck, run: () => panels.open({ kind: "newPurchase" }) },
    { label: "Add item", detail: "A new product to track", icon: PackagePlus, run: () => panels.open({ kind: "newItem" }) },
  ];
  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} aria-expanded={open} className="pr-2.5 pl-3">
        <Plus /> <span className="hidden sm:inline">Create</span>
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right animate-pop-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                setOpen(false);
                it.run();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-canvas"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <it.icon className="size-4" />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-ink">{it.label}</span>
                <span className="block text-xs text-muted">{it.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
