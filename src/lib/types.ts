export type ID = string;

export type Category = "Electronics" | "Networking" | "Electrical" | "Stationery" | "Furniture";
export type Godown = "Chennai Main" | "Coimbatore Hub";

export interface Item {
  id: ID;
  sku: string;
  name: string;
  category: Category;
  unit: string;
  cost: number; // purchase cost per unit (₹)
  price: number; // selling price per unit (₹)
  qty: number;
  minLevel: number;
  godown: Godown;
  supplierId: ID; // preferred supplier, used for one-click reorder
}

export interface Party {
  id: ID;
  name: string;
  contact: string;
  city: string;
  phone: string;
  email: string;
}

export type Customer = Party;
export interface Supplier extends Party {
  leadDays: number;
}

export interface Line {
  itemId: ID;
  qty: number;
  rate: number;
}

export type SaleStatus = "Unpaid" | "Paid" | "Cancelled";
export interface Sale {
  id: ID;
  number: string;
  customerId: ID;
  date: string; // ISO
  dueDate: string;
  lines: Line[];
  status: SaleStatus;
  paidDate?: string;
}

export type PurchaseStatus = "Pending" | "Received" | "Cancelled";
export interface Purchase {
  id: ID;
  number: string;
  supplierId: ID;
  date: string;
  expectedDate: string;
  lines: Line[];
  status: PurchaseStatus;
  receivedDate?: string;
}

export type MovementType = "IN" | "OUT" | "ADJUST";
export interface Movement {
  id: ID;
  itemId: ID;
  date: string;
  type: MovementType;
  qty: number; // signed
  balance: number; // on-hand after the movement
  ref: string; // e.g. INV-1042 / PO-2031 / ADJ
  note: string;
}

export type ActivityKind = "sale" | "purchase" | "receive" | "payment" | "cancel" | "adjust" | "item";
export interface Activity {
  id: ID;
  date: string;
  kind: ActivityKind;
  title: string;
  detail: string;
}

export interface State {
  items: Item[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  movements: Movement[];
  activity: Activity[];
  seq: { sale: number; purchase: number; id: number };
}

export type StockStatus = "In stock" | "Low stock" | "Out of stock";
