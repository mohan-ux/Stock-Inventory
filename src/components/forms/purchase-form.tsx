"use client";

import { Truck } from "lucide-react";
import { useState } from "react";
import { DAY, fromInputDate, toInputDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Line } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DrawerIcon, DrawerLayout, Section } from "@/components/ui/drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { usePanels } from "@/components/shell/panels";
import { LineItems, draftLine, toLines } from "./line-items";
import { FormError } from "./form-bits";

export function PurchaseForm({ supplierId, lines: prefill }: { supplierId?: string; lines?: Line[] }) {
  const { state, now, dispatch } = useStore();
  const panels = usePanels();
  const toast = useToast();

  const leadOf = (id: string) => state.suppliers.find((s) => s.id === id)?.leadDays ?? 3;
  const expectedFor = (id: string) => toInputDate(new Date(now + leadOf(id) * DAY).toISOString());

  const [supplier, setSupplier] = useState(supplierId ?? "");
  const [expected, setExpected] = useState(expectedFor(supplierId ?? ""));
  const [receiveNow, setReceiveNow] = useState(false);
  const [lines, setLines] = useState(prefill?.length ? prefill.map((l) => draftLine(l)) : [draftLine()]);
  const [error, setError] = useState("");

  const chooseSupplier = (id: string) => {
    setSupplier(id);
    setExpected(expectedFor(id));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dispatch({ type: "purchase/create", supplierId: supplier, lines: toLines(lines), expectedDate: fromInputDate(expected), receiveNow });
    if (!res.ok) return setError(res.error);
    const po = res.state.purchases[0];
    toast(
      receiveNow
        ? { title: `${po.number} received`, description: "Stock increased for every item on the order.", action: { label: "View stock", href: "/stock" } }
        : { title: `${po.number} raised`, description: "Stock will increase when you mark it received." },
    );
    panels.replace({ kind: "purchase", id: po.id });
  };

  const sup = state.suppliers.find((s) => s.id === supplier);

  return (
    <form onSubmit={submit} className="contents">
      <DrawerLayout
        eyebrow="Purchase"
        icon={<DrawerIcon icon={Truck} tone="sky" />}
        title={prefill?.length ? "Reorder stock" : "New purchase order"}
        meta="Stock increases when the order is marked received."
        footer={
          <>
            <Button onClick={panels.close}>Cancel</Button>
            <Button type="submit" variant="primary">
              {receiveNow ? "Create & receive" : "Create order"}
            </Button>
          </>
        }
      >
        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier" className="sm:col-span-2" hint={sup ? `${sup.contact} · ${sup.phone} · usually delivers in ${sup.leadDays} days` : undefined}>
              <Select value={supplier} onChange={(e) => chooseSupplier(e.target.value)} required autoFocus={!supplierId}>
                <option value="">Select a supplier…</option>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.city}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expected delivery">
              <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} required />
            </Field>
          </div>
        </Section>
        <Section title="Items">
          <LineItems mode="purchase" lines={lines} onChange={setLines} />
        </Section>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3.5 py-3 text-sm text-ink-2 hover:bg-canvas">
          <input type="checkbox" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} className="size-4 accent-brand-600" />
          Goods already received — add to stock now
        </label>
        <FormError error={error} />
      </DrawerLayout>
    </form>
  );
}
