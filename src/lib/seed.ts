/**
 * Sample data. Rather than hard-coding balances, we *replay* ~75 days of
 * business through the same engine the UI uses. That way every stock level,
 * history row and report figure is consistent with the orders that exist.
 */
import { apply, emptyState, incomingByItem, suggestedReorder, type Action } from "./inventory";
import type { Category, Customer, Godown, Item, State, Supplier } from "./types";
import { DAY } from "./format";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const suppliers: Omit<Supplier, "id">[] = [
  { name: "Apex Electronics Pvt Ltd", contact: "Ravi Shankar", city: "Bengaluru", phone: "+91 98450 22110", email: "orders@apexelectronics.in", leadDays: 4 },
  { name: "NetLink Distributors", contact: "Priya Menon", city: "Chennai", phone: "+91 94440 18273", email: "sales@netlinkdist.in", leadDays: 3 },
  { name: "Volt Electricals", contact: "Suresh Kumar", city: "Coimbatore", phone: "+91 99943 55120", email: "supply@voltelectricals.in", leadDays: 5 },
  { name: "PaperCraft Supplies", contact: "Anitha R", city: "Madurai", phone: "+91 90031 77452", email: "hello@papercraft.in", leadDays: 2 },
  { name: "Urban Office Furniture", contact: "Imran Sheikh", city: "Hyderabad", phone: "+91 98490 66381", email: "trade@urbanoffice.in", leadDays: 7 },
];

const customers: Omit<Customer, "id">[] = [
  { name: "Sri Lakshmi Traders", contact: "K. Venkatesh", city: "Chennai", phone: "+91 98410 33421", email: "accounts@srilakshmitraders.in" },
  { name: "BlueWave IT Solutions", contact: "Deepa Raman", city: "Coimbatore", phone: "+91 97890 11524", email: "purchase@bluewaveit.in" },
  { name: "Kaveri Hospitals", contact: "Dr. Arun Prakash", city: "Trichy", phone: "+91 94430 88710", email: "stores@kaverihospitals.in" },
  { name: "Greenfield Schools", contact: "Meena Iyer", city: "Chennai", phone: "+91 98840 20915", email: "admin@greenfieldschools.in" },
  { name: "Metro Co-working", contact: "Rahul Nair", city: "Bengaluru", phone: "+91 99001 45873", email: "ops@metrocowork.in" },
  { name: "Annai Textiles", contact: "S. Murugan", city: "Tiruppur", phone: "+91 98422 61309", email: "office@annaitextiles.in" },
  { name: "Zenith Engineering", contact: "Farhan Ali", city: "Hosur", phone: "+91 96000 37264", email: "procurement@zenitheng.in" },
];

type ItemSeed = [sku: string, name: string, category: Category, unit: string, cost: number, price: number, opening: number, min: number, godown: Godown, supplier: number, demand: number];

// prettier-ignore
const items: ItemSeed[] = [
  ["EL-1001", "Wireless Mouse M220", "Electronics", "pcs", 540, 799, 120, 30, "Chennai Main", 0, 3],
  ["EL-1002", "Mechanical Keyboard K84", "Electronics", "pcs", 2150, 3199, 45, 12, "Chennai Main", 0, 1.2],
  ["EL-1003", "24\" IPS Monitor FHD", "Electronics", "pcs", 8400, 10999, 28, 8, "Chennai Main", 0, 0.7],
  ["EL-1004", "USB-C Hub 7-in-1", "Electronics", "pcs", 1250, 1899, 70, 20, "Coimbatore Hub", 0, 2],
  ["EL-1005", "Noise-Cancel Headset H5", "Electronics", "pcs", 1780, 2599, 40, 10, "Coimbatore Hub", 0, 1],
  ["EL-1006", "Webcam 1080p Pro", "Electronics", "pcs", 1890, 2799, 32, 10, "Chennai Main", 0, 1.1],
  ["NW-2001", "Gigabit Switch 8-Port", "Networking", "pcs", 1620, 2349, 36, 10, "Chennai Main", 1, 0.9],
  ["NW-2002", "Wi-Fi 6 Router AX1800", "Networking", "pcs", 3900, 5499, 24, 8, "Chennai Main", 1, 0.8],
  ["NW-2003", "Cat6 Patch Cable 3m", "Networking", "pcs", 95, 179, 400, 100, "Coimbatore Hub", 1, 9],
  ["NW-2004", "Cat6 Cable Box 305m", "Networking", "box", 6200, 7999, 14, 5, "Coimbatore Hub", 1, 0.35],
  ["ER-3001", "LED Panel Light 18W", "Electrical", "pcs", 310, 499, 220, 60, "Coimbatore Hub", 2, 5],
  ["ER-3002", "Modular Switch 6A", "Electrical", "pcs", 48, 85, 900, 200, "Coimbatore Hub", 2, 18],
  ["ER-3003", "Copper Wire 1.5 sq mm (90m)", "Electrical", "roll", 1380, 1899, 60, 20, "Coimbatore Hub", 2, 1.6],
  ["ER-3004", "MCB 32A Double Pole", "Electrical", "pcs", 420, 649, 110, 30, "Chennai Main", 2, 2.4],
  ["ER-3005", "Extension Board 6-Socket", "Electrical", "pcs", 380, 599, 85, 25, "Chennai Main", 2, 2.2],
  ["ST-4001", "A4 Copier Paper 75 GSM", "Stationery", "ream", 245, 320, 600, 150, "Chennai Main", 3, 14],
  ["ST-4002", "Gel Pen Blue (Box of 10)", "Stationery", "box", 92, 150, 300, 80, "Chennai Main", 3, 6],
  ["ST-4003", "Spiral Notebook A5", "Stationery", "pcs", 38, 65, 500, 120, "Coimbatore Hub", 3, 10],
  ["ST-4004", "Whiteboard Marker Set", "Stationery", "set", 140, 229, 160, 40, "Coimbatore Hub", 3, 3.5],
  ["FN-5001", "Ergonomic Mesh Chair", "Furniture", "pcs", 6800, 9499, 18, 6, "Chennai Main", 4, 0.45],
  ["FN-5002", "Office Desk 4ft", "Furniture", "pcs", 5400, 7299, 14, 5, "Chennai Main", 4, 0.35],
  ["FN-5003", "Steel Storage Cabinet", "Furniture", "pcs", 7900, 10499, 10, 4, "Coimbatore Hub", 4, 0.2],
];

export function buildSeed(now = Date.now()): State {
  const rand = rng(20261123);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  let state = emptyState();
  const run = (a: Action) => {
    try {
      state = apply(state, a);
      return true;
    } catch {
      return false;
    }
  };

  const DAYS = 75;
  const start = now - DAYS * DAY;
  const time = (dayOffset: number, hour: number) => {
    const d = new Date(start + dayOffset * DAY);
    d.setHours(hour, Math.floor(rand() * 60), 0, 0);
    return d.getTime();
  };
  // Stock-moving events are replayed in order, so their timestamps must never go
  // backwards — otherwise the history would show balances out of sequence. Today's
  // events are squeezed into the minutes before "now".
  let clock = 0;
  const at = (dayOffset: number, hour: number) => {
    const t = Math.min(Math.max(time(dayOffset, hour), clock + 60_000), now - 60_000);
    clock = Math.max(clock, t);
    return new Date(t).toISOString();
  };
  // Payments don't move stock, so they can be dated ahead of the replay (up to now).
  const later = (dayOffset: number, hour: number) =>
    new Date(Math.min(time(dayOffset, hour), now - (5 + Math.floor(rand() * 90)) * 60_000)).toISOString();

  for (const sup of suppliers) run({ type: "supplier/create", supplier: sup });
  for (const c of customers) run({ type: "customer/create", customer: c });
  state.suppliers.reverse();
  state.customers.reverse();
  // item/create logs activity; we clear that noise after setup.
  for (const [sku, name, category, unit, cost, price, opening, min, godown, sup] of items) {
    run({
      type: "item/create",
      item: { sku, name, category, unit, cost, price, minLevel: min, godown, supplierId: state.suppliers[sup].id },
      openingQty: opening,
      date: at(0, 9),
    });
  }
  state.items.reverse();
  state.activity = [];

  const demand = new Map(items.map(([sku, , , , , , , , , , d]) => [sku, d]));
  const pendingReceipts: { id: string; day: number }[] = [];

  /** The n-th lowest item (relative to its minimum) that has nothing on order. */
  const lowest = (n: number) => {
    const incoming = incomingByItem(state);
    return state.items.filter((i) => !incoming.get(i.id)).sort((a, b) => a.qty / a.minLevel - b.qty / b.minLevel)[n];
  };
  const order = (i: Item | undefined, day: number) =>
    i && run({ type: "purchase/create", supplierId: i.supplierId, lines: [{ itemId: i.id, qty: suggestedReorder(i), rate: i.cost }], date: at(day, 10) });

  for (let day = 1; day <= DAYS; day++) {
    const isSunday = new Date(start + day * DAY).getDay() === 0;

    // 1) Receive POs that have arrived.
    for (const r of pendingReceipts.filter((r) => r.day === day)) {
      if (day < DAYS - 1 || rand() > 0.5) run({ type: "purchase/receive", id: r.id, date: at(day, 9) });
    }

    // 2) Sales.
    const orders = isSunday ? 0 : 1 + Math.floor(rand() * 3);
    for (let o = 0; o < orders; o++) {
      const lineCount = 1 + Math.floor(rand() * 3);
      const chosen = new Set<string>();
      const lines = [];
      for (let k = 0; k < lineCount; k++) {
        const it = pick(state.items);
        if (chosen.has(it.id) || it.qty <= 0) continue;
        chosen.add(it.id);
        const d = demand.get(it.sku) ?? 1;
        const surge = day > DAYS - 12 ? 1.3 : 1; // a busy fortnight to end on
        const q = Math.min(it.qty, Math.max(1, Math.round(d * surge * (1.5 + rand() * 4))));
        lines.push({ itemId: it.id, qty: q, rate: it.price });
      }
      if (!lines.length) continue;
      const age = DAYS - day;
      const paid = age > 18 ? rand() > 0.05 : age > 8 ? rand() > 0.35 : rand() > 0.75;
      const ok = run({ type: "sale/create", customerId: pick(state.customers).id, lines, date: at(day, 10 + o * 2), dueInDays: 15 });
      if (ok && paid) {
        const sale = state.sales[0];
        const payDay = Math.min(DAYS, day + 2 + Math.floor(rand() * 10));
        run({ type: "sale/markPaid", id: sale.id, date: later(payDay, 16) });
      }
    }

    // 3) Replenish low stock (stop near the end, so the dashboard has alerts).
    if (day % 3 === 0 && day < DAYS - 12) {
      const incoming = incomingByItem(state);
      const low = state.items.filter((i) => i.qty <= i.minLevel * 1.4 && !incoming.get(i.id));
      const bySupplier = new Map<string, typeof low>();
      for (const i of low) bySupplier.set(i.supplierId, [...(bySupplier.get(i.supplierId) ?? []), i]);
      for (const [supplierId, list] of bySupplier) {
        const sup = state.suppliers.find((s) => s.id === supplierId)!;
        const ok = run({
          type: "purchase/create",
          supplierId,
          lines: list.map((i) => ({ itemId: i.id, qty: suggestedReorder(i), rate: i.cost })),
          date: at(day, 15),
        });
        if (ok) pendingReceipts.push({ id: state.purchases[0].id, day: day + sup.leadDays });
      }
    }

    // 4) A few realistic exceptions near the end, each on its own day.
    if (day === DAYS - 9) order(lowest(0), day); // on the way, and running late
    if (day === DAYS - 8) order(lowest(0), day);
    if (day === DAYS - 6) run({ type: "purchase/cancel", id: state.purchases[0].id, date: at(day, 10) });
    if (day === DAYS - 3) {
      const unpaid = state.sales.find((s, i) => i > 6 && s.status === "Unpaid");
      if (unpaid) run({ type: "sale/cancel", id: unpaid.id, date: at(day, 12) });
    }
    if (day === DAYS - 1) order(lowest(0), day);
    if (day === DAYS) run({ type: "stock/adjust", itemId: state.items[15].id, delta: -6, note: "Damaged in transit (water)", date: at(day, 17) });
  }

  // Payments were dated ahead of the replay, so put the feed in true time order.
  state.activity.sort((a, b) => b.date.localeCompare(a.date));

  return state;
}
