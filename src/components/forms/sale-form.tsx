"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { toInputDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { DrawerIcon, DrawerLayout, Section } from "@/components/ui/drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { usePanels } from "@/components/shell/panels";
import { LineItems, draftLine, toLines } from "./line-items";
import { FormError, dateFromInput } from "./form-bits";

export function SaleForm({ customerId, itemId }: { customerId?: string; itemId?: string }) {
  const { state, dispatch } = useStore();
  const panels = usePanels();
  const toast = useToast();
  const initialItem = itemId ? state.items.find((i) => i.id === itemId) : undefined;

  const [customer, setCustomer] = useState(customerId ?? "");
  const [date, setDate] = useState(toInputDate(new Date().toISOString()));
  const [due, setDue] = useState("15");
  const [paid, setPaid] = useState(false);
  const [lines, setLines] = useState([draftLine(initialItem ? { itemId: initialItem.id, rate: initialItem.price } : undefined)]);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dispatch({ type: "sale/create", customerId: customer, lines: toLines(lines), date: dateFromInput(date), dueInDays: Number(due), paid });
    if (!res.ok) return setError(res.error);
    const sale = res.state.sales[0];
    const low = sale.lines.map((l) => res.state.items.find((i) => i.id === l.itemId)!).filter((i) => i.qty <= i.minLevel);
    toast({
      title: `${sale.number} created`,
      description: low.length ? `Stock reduced. ${low.map((i) => i.name).join(", ")} now below minimum.` : "Stock reduced for the items sold.",
      action: low.length ? { label: "Review low stock", href: "/stock?status=low" } : undefined,
    });
    panels.replace({ kind: "sale", id: sale.id });
  };

  return (
    <form onSubmit={submit} className="contents">
      <DrawerLayout
        eyebrow="Sales"
        icon={<DrawerIcon icon={FileText} />}
        title="New invoice"
        meta="Stock is deducted as soon as the invoice is saved."
        footer={
          <>
            <Button onClick={panels.close}>Cancel</Button>
            <Button type="submit" variant="primary">
              Create invoice
            </Button>
          </>
        }
      >
        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" className="sm:col-span-2">
              <Select value={customer} onChange={(e) => setCustomer(e.target.value)} required autoFocus>
                <option value="">Select a customer…</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.city}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Invoice date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={toInputDate(new Date().toISOString())} required />
            </Field>
            <Field label="Payment terms">
              <Select value={due} onChange={(e) => setDue(e.target.value)}>
                <option value="0">Due on receipt</option>
                <option value="7">Net 7</option>
                <option value="15">Net 15</option>
                <option value="30">Net 30</option>
              </Select>
            </Field>
          </div>
        </Section>
        <Section title="Items">
          <LineItems mode="sale" lines={lines} onChange={setLines} />
        </Section>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3.5 py-3 text-sm text-ink-2 hover:bg-canvas">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-brand-600" />
          Payment already received
        </label>
        <FormError error={error} />
      </DrawerLayout>
    </form>
  );
}
