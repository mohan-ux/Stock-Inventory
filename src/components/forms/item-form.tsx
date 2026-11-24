"use client";

import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Category, Godown } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DrawerIcon, DrawerLayout, Section } from "@/components/ui/drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { usePanels } from "@/components/shell/panels";
import { FormError } from "./form-bits";

export const CATEGORIES: Category[] = ["Electronics", "Networking", "Electrical", "Stationery", "Furniture"];
export const GODOWNS: Godown[] = ["Chennai Main", "Coimbatore Hub"];

/** Create an item, or edit one when `id` is given (quantity changes go through adjustments). */
export function ItemForm({ id }: { id?: string }) {
  const { state, dispatch } = useStore();
  const panels = usePanels();
  const toast = useToast();
  const existing = id ? state.items.find((i) => i.id === id) : undefined;

  const [f, setF] = useState({
    name: existing?.name ?? "",
    sku: existing?.sku ?? "",
    category: existing?.category ?? CATEGORIES[0],
    unit: existing?.unit ?? "pcs",
    godown: existing?.godown ?? GODOWNS[0],
    supplierId: existing?.supplierId ?? state.suppliers[0]?.id ?? "",
    cost: String(existing?.cost ?? ""),
    price: String(existing?.price ?? ""),
    minLevel: String(existing?.minLevel ?? "10"),
    opening: "0",
  });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: f.name,
      sku: f.sku,
      category: f.category as Category,
      unit: f.unit.trim() || "pcs",
      godown: f.godown as Godown,
      supplierId: f.supplierId,
      cost: Number(f.cost),
      price: Number(f.price),
      minLevel: Number(f.minLevel),
    };
    if (data.price < data.cost) return setError("Selling price is below cost. Check the rates.");
    if (existing) {
      const res = dispatch({ type: "item/update", id: existing.id, patch: data });
      if (!res.ok) return setError(res.error);
      toast({ title: "Item updated" });
      panels.replace({ kind: "item", id: existing.id });
    } else {
      const res = dispatch({ type: "item/create", item: data, openingQty: Number(f.opening) || 0 });
      if (!res.ok) return setError(res.error);
      toast({ title: `${res.state.items[0].name} added`, description: `${f.opening || 0} ${data.unit} opening stock in ${data.godown}.` });
      panels.replace({ kind: "item", id: res.state.items[0].id });
    }
  };

  return (
    <form onSubmit={submit} className="contents">
      <DrawerLayout
        eyebrow="Stock"
        icon={<DrawerIcon icon={PackagePlus} tone="emerald" />}
        title={existing ? `Edit ${existing.name}` : "New item"}
        footer={
          <>
            <Button onClick={existing ? panels.back : panels.close}>Cancel</Button>
            <Button type="submit" variant="primary">
              {existing ? "Save changes" : "Add item"}
            </Button>
          </>
        }
      >
        <Section title="Item">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input value={f.name} onChange={set("name")} required autoFocus placeholder="e.g. Wireless Mouse M220" />
            </Field>
            <Field label="SKU">
              <Input value={f.sku} onChange={set("sku")} required disabled={!!existing} placeholder="EL-1007" className="uppercase" />
            </Field>
            <Field label="Unit">
              <Input value={f.unit} onChange={set("unit")} placeholder="pcs, box, roll…" />
            </Field>
            <Field label="Category">
              <Select value={f.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Godown">
              <Select value={f.godown} onChange={set("godown")}>
                {GODOWNS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>
        <Section title="Pricing & reorder">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cost price (₹)">
              <Input type="number" min={0} value={f.cost} onChange={set("cost")} required className="tabular" />
            </Field>
            <Field label="Selling price (₹)">
              <Input type="number" min={0} value={f.price} onChange={set("price")} required className="tabular" />
            </Field>
            <Field label="Minimum level" hint="Below this, the item shows as low stock on the dashboard.">
              <Input type="number" min={0} value={f.minLevel} onChange={set("minLevel")} required className="tabular" />
            </Field>
            {!existing && (
              <Field label="Opening stock">
                <Input type="number" min={0} value={f.opening} onChange={set("opening")} className="tabular" />
              </Field>
            )}
            <Field label="Preferred supplier" className="sm:col-span-2" hint="Used for one-click reorders.">
              <Select value={f.supplierId} onChange={set("supplierId")}>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>
        <FormError error={error} />
      </DrawerLayout>
    </form>
  );
}
