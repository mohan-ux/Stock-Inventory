/**
 * The inventory engine.
 *
 * Every change to the data goes through `apply(state, action)`. It is a pure
 * function: it validates the action, then returns the next state with the stock
 * levels, stock history (movements) and activity feed updated together. This
 * keeps the workflow consistent — a received PO always adds stock, a sale
 * always deducts it, a cancellation always reverses it.
 */
import type { Activity, ActivityKind, Item, Line, Movement, MovementType, Purchase, Sale, State, StockStatus, Supplier, Customer } from "./types";
import { DAY, money } from "./format";

export const GST_RATE = 0.18;

export type Action =
  | { type: "sale/create"; customerId: string; lines: Line[]; date?: string; dueInDays?: number; paid?: boolean }
  | { type: "sale/markPaid"; id: string; date?: string }
  | { type: "sale/cancel"; id: string; date?: string }
  | { type: "purchase/create"; supplierId: string; lines: Line[]; date?: string; expectedDate?: string; receiveNow?: boolean }
  | { type: "purchase/receive"; id: string; date?: string }
  | { type: "purchase/cancel"; id: string; date?: string }
  | { type: "item/create"; item: Omit<Item, "id" | "qty">; openingQty: number; date?: string }
  | { type: "item/update"; id: string; patch: Partial<Omit<Item, "id" | "qty">> }
  | { type: "stock/adjust"; itemId: string; delta: number; note: string; date?: string }
  | { type: "customer/create"; customer: Omit<Customer, "id"> }
  | { type: "supplier/create"; supplier: Omit<Supplier, "id"> };

export class InventoryError extends Error {}

const fail = (msg: string): never => {
  throw new InventoryError(msg);
};

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export const lineTotal = (lines: Line[]) => lines.reduce((s, l) => s + l.qty * l.rate, 0);
export const withTax = (subtotal: number) => Math.round(subtotal * (1 + GST_RATE));
export const saleTotal = (s: Sale) => withTax(lineTotal(s.lines));
export const purchaseTotal = (p: Purchase) => withTax(lineTotal(p.lines));
export const unitsOf = (lines: Line[]) => lines.reduce((s, l) => s + l.qty, 0);

export function stockStatus(item: Pick<Item, "qty" | "minLevel">): StockStatus {
  if (item.qty <= 0) return "Out of stock";
  if (item.qty <= item.minLevel) return "Low stock";
  return "In stock";
}

export const isLow = (item: Item) => item.qty <= item.minLevel;

export type SaleDisplayStatus = Sale["status"] | "Overdue";
export function saleDisplayStatus(s: Sale, now = Date.now()): SaleDisplayStatus {
  if (s.status === "Unpaid" && new Date(s.dueDate).getTime() < now) return "Overdue";
  return s.status;
}

export type PurchaseDisplayStatus = Purchase["status"] | "Late";
export function purchaseDisplayStatus(p: Purchase, now = Date.now()): PurchaseDisplayStatus {
  if (p.status === "Pending" && new Date(p.expectedDate).getTime() < now - DAY / 2) return "Late";
  return p.status;
}

/** Units already ordered on pending POs, per item. */
export function incomingByItem(state: State) {
  const map = new Map<string, number>();
  for (const p of state.purchases) {
    if (p.status !== "Pending") continue;
    for (const l of p.lines) map.set(l.itemId, (map.get(l.itemId) ?? 0) + l.qty);
  }
  return map;
}

/** A sensible reorder quantity: bring stock up to 3× the minimum level. */
export function suggestedReorder(item: Item, incoming = 0) {
  return Math.max(item.minLevel * 3 - item.qty - incoming, item.minLevel);
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export function emptyState(): State {
  return {
    items: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    movements: [],
    activity: [],
    seq: { sale: 1040, purchase: 2030, id: 1 },
  };
}

export function apply(prev: State, action: Action): State {
  // Work on shallow copies so the previous state is never mutated.
  const s: State = {
    ...prev,
    items: prev.items.map((i) => ({ ...i })),
    sales: [...prev.sales],
    purchases: [...prev.purchases],
    movements: [...prev.movements],
    activity: [...prev.activity],
    customers: [...prev.customers],
    suppliers: [...prev.suppliers],
    seq: { ...prev.seq },
  };
  const date = ("date" in action && action.date) || new Date().toISOString();

  const nextId = (prefix: string) => `${prefix}_${(s.seq.id++).toString(36)}`;
  const item = (id: string) => s.items.find((i) => i.id === id) ?? fail("Item not found");
  const log = (kind: ActivityKind, title: string, detail: string) => {
    const a: Activity = { id: nextId("act"), date, kind, title, detail };
    s.activity.unshift(a);
  };
  const move = (itemId: string, type: MovementType, delta: number, ref: string, note: string) => {
    const it = item(itemId);
    it.qty += delta;
    const m: Movement = { id: nextId("mv"), itemId, date, type, qty: delta, balance: it.qty, ref, note };
    s.movements.unshift(m);
  };
  const validateLines = (lines: Line[]) => {
    if (!lines.length) fail("Add at least one item.");
    for (const l of lines) {
      item(l.itemId);
      if (!Number.isFinite(l.qty) || l.qty <= 0) fail("Quantities must be greater than zero.");
      if (!Number.isFinite(l.rate) || l.rate < 0) fail("Rates cannot be negative.");
    }
    if (new Set(lines.map((l) => l.itemId)).size !== lines.length) fail("Each item can appear only once.");
  };

  switch (action.type) {
    case "sale/create": {
      const customer = s.customers.find((c) => c.id === action.customerId) ?? fail("Choose a customer.");
      validateLines(action.lines);
      for (const l of action.lines) {
        const it = item(l.itemId);
        if (l.qty > it.qty) fail(`Only ${it.qty} ${it.unit} of ${it.name} in stock.`);
      }
      const number = `INV-${++s.seq.sale}`;
      const sale: Sale = {
        id: nextId("sale"),
        number,
        customerId: customer.id,
        date,
        dueDate: new Date(new Date(date).getTime() + (action.dueInDays ?? 15) * DAY).toISOString(),
        lines: action.lines,
        status: action.paid ? "Paid" : "Unpaid",
        paidDate: action.paid ? date : undefined,
      };
      s.sales.unshift(sale);
      for (const l of action.lines) move(l.itemId, "OUT", -l.qty, number, `Sold to ${customer.name}`);
      log("sale", `${number} invoiced to ${customer.name}`, `${unitsOf(sale.lines)} units · ${money(saleTotal(sale))}`);
      return s;
    }

    case "sale/markPaid": {
      const idx = s.sales.findIndex((x) => x.id === action.id);
      const sale = s.sales[idx] ?? fail("Invoice not found");
      if (sale.status !== "Unpaid") fail("Only unpaid invoices can be marked paid.");
      s.sales[idx] = { ...sale, status: "Paid", paidDate: date };
      log("payment", `Payment received for ${sale.number}`, money(saleTotal(sale)));
      return s;
    }

    case "sale/cancel": {
      const idx = s.sales.findIndex((x) => x.id === action.id);
      const sale = s.sales[idx] ?? fail("Invoice not found");
      if (sale.status === "Cancelled") fail("Invoice is already cancelled.");
      s.sales[idx] = { ...sale, status: "Cancelled" };
      for (const l of sale.lines) move(l.itemId, "IN", l.qty, sale.number, "Invoice cancelled — stock returned");
      log("cancel", `${sale.number} cancelled`, `${unitsOf(sale.lines)} units returned to stock`);
      return s;
    }

    case "purchase/create": {
      const supplier = s.suppliers.find((x) => x.id === action.supplierId) ?? fail("Choose a supplier.");
      validateLines(action.lines);
      const number = `PO-${++s.seq.purchase}`;
      const po: Purchase = {
        id: nextId("po"),
        number,
        supplierId: supplier.id,
        date,
        expectedDate: action.expectedDate ?? new Date(new Date(date).getTime() + supplier.leadDays * DAY).toISOString(),
        lines: action.lines,
        status: "Pending",
      };
      s.purchases.unshift(po);
      log("purchase", `${number} raised with ${supplier.name}`, `${unitsOf(po.lines)} units · ${money(purchaseTotal(po))}`);
      if (action.receiveNow) return apply(s, { type: "purchase/receive", id: po.id, date });
      return s;
    }

    case "purchase/receive": {
      const idx = s.purchases.findIndex((x) => x.id === action.id);
      const po = s.purchases[idx] ?? fail("Purchase order not found");
      if (po.status !== "Pending") fail("Only pending orders can be received.");
      const supplier = s.suppliers.find((x) => x.id === po.supplierId);
      s.purchases[idx] = { ...po, status: "Received", receivedDate: date };
      for (const l of po.lines) {
        move(l.itemId, "IN", l.qty, po.number, `Received from ${supplier?.name ?? "supplier"}`);
        item(l.itemId).cost = l.rate; // latest purchase rate becomes the unit cost
      }
      log("receive", `${po.number} received`, `${unitsOf(po.lines)} units added to stock`);
      return s;
    }

    case "purchase/cancel": {
      const idx = s.purchases.findIndex((x) => x.id === action.id);
      const po = s.purchases[idx] ?? fail("Purchase order not found");
      if (po.status !== "Pending") fail("Only pending orders can be cancelled.");
      s.purchases[idx] = { ...po, status: "Cancelled" };
      log("cancel", `${po.number} cancelled`, "No stock was affected");
      return s;
    }

    case "item/create": {
      const { item: data, openingQty } = action;
      if (!data.name.trim()) fail("Item name is required.");
      if (s.items.some((i) => i.sku.toLowerCase() === data.sku.trim().toLowerCase())) fail("That SKU already exists.");
      if (openingQty < 0 || data.minLevel < 0) fail("Quantities cannot be negative.");
      const it: Item = { ...data, sku: data.sku.trim().toUpperCase(), name: data.name.trim(), id: nextId("item"), qty: 0 };
      s.items.unshift(it);
      if (openingQty > 0) move(it.id, "ADJUST", openingQty, "OPENING", "Opening stock");
      log("item", `${it.name} added`, `${openingQty} ${it.unit} opening stock · ${it.godown}`);
      return s;
    }

    case "item/update": {
      const it = item(action.id);
      const { patch } = action;
      if (patch.name !== undefined && !patch.name.trim()) fail("Item name is required.");
      if ([patch.minLevel, patch.cost, patch.price].some((n) => n !== undefined && (!Number.isFinite(n) || n < 0))) fail("Rates and levels cannot be negative.");
      // The SKU identifies the item in history and reports, so it is fixed once created.
      const { sku: _sku, ...rest } = patch; // eslint-disable-line @typescript-eslint/no-unused-vars
      Object.assign(it, rest, rest.name ? { name: rest.name.trim() } : {});
      log("item", `${it.name} updated`, "Item details changed");
      return s;
    }

    case "stock/adjust": {
      const it = item(action.itemId);
      if (!action.delta) fail("Enter a quantity to adjust.");
      if (it.qty + action.delta < 0) fail(`Cannot remove more than ${it.qty} ${it.unit}.`);
      move(it.id, "ADJUST", action.delta, "ADJ", action.note || "Manual adjustment");
      log("adjust", `${it.name} adjusted ${action.delta > 0 ? "+" : ""}${action.delta}`, action.note || "Manual adjustment");
      return s;
    }

    case "customer/create": {
      if (!action.customer.name.trim()) fail("Customer name is required.");
      s.customers.unshift({ ...action.customer, id: nextId("cus") });
      return s;
    }

    case "supplier/create": {
      if (!action.supplier.name.trim()) fail("Supplier name is required.");
      s.suppliers.unshift({ ...action.supplier, id: nextId("sup") });
      return s;
    }
  }
}
