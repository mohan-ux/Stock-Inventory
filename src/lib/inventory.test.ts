import { describe, expect, it } from "vitest";
import { apply, incomingByItem, InventoryError, isLow, saleDisplayStatus, stockStatus, suggestedReorder, withTax, type Action } from "./inventory";
import { buildSeed } from "./seed";
import type { State } from "./types";

const NOW = new Date("2026-11-23T10:00:00").getTime();
const seed = buildSeed(NOW);

const qtyOf = (s: State, itemId: string) => s.items.find((i) => i.id === itemId)!.qty;
const rejects = (s: State, action: Action, message: RegExp) => {
  expect(() => apply(s, action)).toThrow(InventoryError);
  expect(() => apply(s, action)).toThrow(message);
};

/** The rules every state must satisfy, however it was reached. */
function expectConsistent(s: State) {
  for (const item of s.items) {
    const moves = s.movements.filter((m) => m.itemId === item.id);
    // Stock on hand is exactly the sum of its history…
    expect(moves.reduce((sum, m) => sum + m.qty, 0)).toBe(item.qty);
    expect(item.qty).toBeGreaterThanOrEqual(0);
    // …and each history row's balance is a correct running total (rows are newest-first).
    let running = 0;
    for (const m of [...moves].reverse()) {
      running += m.qty;
      expect(m.balance).toBe(running);
    }
  }
  for (const sale of s.sales) {
    const moves = s.movements.filter((m) => m.ref === sale.number);
    expect(moves.filter((m) => m.type === "OUT")).toHaveLength(sale.lines.length);
    expect(moves.filter((m) => m.type === "IN")).toHaveLength(sale.status === "Cancelled" ? sale.lines.length : 0);
  }
  for (const po of s.purchases) {
    expect(s.movements.filter((m) => m.ref === po.number)).toHaveLength(po.status === "Received" ? po.lines.length : 0);
  }
  const ids = [s.items, s.sales, s.purchases, s.movements, s.activity, s.customers, s.suppliers].flat().map((x) => x.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(s.sales.map((x) => x.number)).size).toBe(s.sales.length);
  expect(new Set(s.purchases.map((x) => x.number)).size).toBe(s.purchases.length);
}

describe("sample data", () => {
  it("is consistent with the engine's rules", () => expectConsistent(seed));

  it("is deterministic for a given clock", () => {
    expect(JSON.stringify(buildSeed(NOW))).toBe(JSON.stringify(seed));
  });

  it("has something to show on every screen", () => {
    expect(seed.items).toHaveLength(22);
    expect(seed.sales.length).toBeGreaterThan(80);
    expect(seed.items.some(isLow)).toBe(true);
    expect(seed.purchases.some((p) => p.status === "Pending")).toBe(true);
    expect(seed.purchases.some((p) => p.status === "Cancelled")).toBe(true);
    expect(seed.sales.some((s) => s.status === "Cancelled")).toBe(true);
    expect(seed.sales.some((s) => saleDisplayStatus(s, NOW) === "Overdue")).toBe(true);
  });

  it("lists activity and stock history newest first", () => {
    for (const list of [seed.activity, seed.movements]) {
      const times = list.map((x) => new Date(x.date).getTime());
      expect(times.every((t, i) => i === 0 || times[i - 1] >= t)).toBe(true);
    }
  });

  it("never dates anything in the future", () => {
    const docs = [seed.sales, seed.purchases, seed.movements, seed.activity].flat();
    expect(docs.every((d) => new Date(d.date).getTime() <= NOW)).toBe(true);
  });
});

describe("sales", () => {
  const item = seed.items.find((i) => i.qty > 5)!;
  const customerId = seed.customers[0].id;
  const sell = (s: State, qty: number) => apply(s, { type: "sale/create", customerId, lines: [{ itemId: item.id, qty, rate: item.price }] });

  it("reduce stock and log activity", () => {
    const s = sell(seed, 2);
    expect(qtyOf(s, item.id)).toBe(item.qty - 2);
    expect(s.sales[0]).toMatchObject({ status: "Unpaid", customerId });
    expect(s.activity[0].kind).toBe("sale");
    expectConsistent(s);
  });

  it("never mutate the previous state", () => {
    const before = JSON.stringify(seed);
    sell(seed, 1);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it("cannot sell more than is in stock", () => {
    rejects(seed, { type: "sale/create", customerId, lines: [{ itemId: item.id, qty: item.qty + 1, rate: 1 }] }, /in stock/);
  });

  it.each([
    ["no lines", [], /at least one/],
    ["zero quantity", [{ qty: 0, rate: 1 }], /greater than zero/],
    ["NaN quantity", [{ qty: NaN, rate: 1 }], /greater than zero/],
    ["negative rate", [{ qty: 1, rate: -1 }], /negative/],
    ["duplicate items", [{ qty: 1, rate: 1 }, { qty: 1, rate: 1 }], /only once/],
  ])("reject %s", (_, lines, message) => {
    rejects(seed, { type: "sale/create", customerId, lines: lines.map((l) => ({ itemId: item.id, ...l })) }, message);
  });

  it("require a known customer", () => {
    rejects(seed, { type: "sale/create", customerId: "missing", lines: [{ itemId: item.id, qty: 1, rate: 1 }] }, /customer/i);
  });

  it("can be paid once, and cancelling returns the stock", () => {
    let s = sell(seed, 3);
    const id = s.sales[0].id;
    s = apply(s, { type: "sale/markPaid", id });
    expect(s.sales[0].status).toBe("Paid");
    rejects(s, { type: "sale/markPaid", id }, /Only unpaid/);

    s = apply(s, { type: "sale/cancel", id });
    expect(qtyOf(s, item.id)).toBe(item.qty);
    rejects(s, { type: "sale/cancel", id }, /already cancelled/);
    expectConsistent(s);
  });

  it("flag low and out of stock as they happen", () => {
    let s = apply(seed, {
      type: "item/create",
      item: { sku: "TST-1", name: "Test item", category: "Electronics", unit: "pcs", cost: 10, price: 20, minLevel: 5, godown: "Chennai Main", supplierId: seed.suppliers[0].id },
      openingQty: 12,
    });
    const id = s.items[0].id;
    s = apply(s, { type: "sale/create", customerId, lines: [{ itemId: id, qty: 8, rate: 20 }] });
    expect(stockStatus(s.items[0])).toBe("Low stock");
    s = apply(s, { type: "sale/create", customerId, lines: [{ itemId: id, qty: 4, rate: 20 }] });
    expect(stockStatus(s.items[0])).toBe("Out of stock");
  });
});

describe("purchases", () => {
  const item = seed.items.find(isLow) ?? seed.items[0];
  const supplierId = seed.suppliers[0].id;
  const order = (s: State, qty: number, receiveNow = false) =>
    apply(s, { type: "purchase/create", supplierId, lines: [{ itemId: item.id, qty, rate: item.cost + 10 }], receiveNow });

  it("only change stock when received", () => {
    let s = order(seed, 50);
    const po = s.purchases[0];
    expect(qtyOf(s, item.id)).toBe(item.qty);
    expect(incomingByItem(s).get(item.id)).toBeGreaterThanOrEqual(50);

    s = apply(s, { type: "purchase/receive", id: po.id });
    expect(qtyOf(s, item.id)).toBe(item.qty + 50);
    expect(s.items.find((i) => i.id === item.id)!.cost).toBe(item.cost + 10); // latest rate becomes the cost
    rejects(s, { type: "purchase/receive", id: po.id }, /Only pending/);
    rejects(s, { type: "purchase/cancel", id: po.id }, /Only pending/);
    expectConsistent(s);
  });

  it("can be created and received in one step", () => {
    const s = order(seed, 7, true);
    expect(s.purchases[0].status).toBe("Received");
    expect(qtyOf(s, item.id)).toBe(item.qty + 7);
  });

  it("leave stock alone when cancelled", () => {
    let s = order(seed, 3);
    s = apply(s, { type: "purchase/cancel", id: s.purchases[0].id });
    expect(s.purchases[0].status).toBe("Cancelled");
    expect(qtyOf(s, item.id)).toBe(item.qty);
  });
});

describe("stock adjustments and items", () => {
  const item = seed.items.find((i) => i.qty > 2)!;

  it("record adjustments in the history", () => {
    const s = apply(seed, { type: "stock/adjust", itemId: item.id, delta: -1, note: "Damaged" });
    expect(qtyOf(s, item.id)).toBe(item.qty - 1);
    expect(s.movements[0]).toMatchObject({ type: "ADJUST", qty: -1, note: "Damaged" });
  });

  it("cannot adjust below zero, or by nothing", () => {
    rejects(seed, { type: "stock/adjust", itemId: item.id, delta: -(item.qty + 1), note: "" }, /Cannot remove/);
    rejects(seed, { type: "stock/adjust", itemId: item.id, delta: 0, note: "" }, /Enter a quantity/);
  });

  it("reject duplicate SKUs, ignoring case and spaces", () => {
    rejects(seed, { type: "item/create", item: { ...item, sku: ` ${item.sku.toLowerCase()} ` }, openingQty: 0 }, /SKU already exists/);
  });

  it("validate edits and keep the SKU fixed", () => {
    rejects(seed, { type: "item/update", id: item.id, patch: { name: "  " } }, /name is required/);
    rejects(seed, { type: "item/update", id: item.id, patch: { minLevel: -1 } }, /negative/);
    const s = apply(seed, { type: "item/update", id: item.id, patch: { name: " Renamed ", sku: "CHANGED" } });
    expect(s.items.find((i) => i.id === item.id)).toMatchObject({ name: "Renamed", sku: item.sku });
  });
});

describe("helpers", () => {
  it("add 18% GST", () => expect(withTax(1000)).toBe(1180));

  it("suggest reorders up to 3× the minimum, never less than the minimum", () => {
    expect(suggestedReorder({ ...seed.items[0], qty: 2, minLevel: 10 })).toBe(28);
    expect(suggestedReorder({ ...seed.items[0], qty: 2, minLevel: 10 }, 25)).toBe(10);
  });
});
