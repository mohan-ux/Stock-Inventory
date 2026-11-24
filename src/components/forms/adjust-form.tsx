"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { qty as fmtQty } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { DrawerIcon, DrawerLayout, Section } from "@/components/ui/drawer";
import { Field, Input, Segmented, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { usePanels } from "@/components/shell/panels";
import { FormError } from "./form-bits";

const REASONS = {
  remove: ["Damaged / broken", "Stock count correction", "Used internally", "Sample / demo"],
  add: ["Stock count correction", "Returned by customer", "Found in godown"],
};

export function AdjustForm({ itemId }: { itemId: string }) {
  const { state, dispatch } = useStore();
  const panels = usePanels();
  const toast = useToast();
  const item = state.items.find((i) => i.id === itemId);

  const [dir, setDir] = useState<"remove" | "add">("remove");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASONS.remove[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!item) return null;

  const n = Number(amount) || 0;
  const after = item.qty + (dir === "add" ? n : -n);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const delta = dir === "add" ? n : -n;
    const res = dispatch({ type: "stock/adjust", itemId, delta, note: note.trim() ? `${reason} — ${note.trim()}` : reason });
    if (!res.ok) return setError(res.error);
    toast({ title: "Stock adjusted", description: `${item.name}: ${fmtQty(item.qty)} → ${fmtQty(after)} ${item.unit}` });
    panels.back();
  };

  return (
    <form onSubmit={submit} className="contents">
      <DrawerLayout
        eyebrow="Stock adjustment"
        icon={<DrawerIcon icon={SlidersHorizontal} tone="amber" />}
        title={item.name}
        meta={`${item.sku} · ${fmtQty(item.qty)} ${item.unit} on hand`}
        footer={
          <>
            <Button onClick={panels.back}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!n}>
              Save adjustment
            </Button>
          </>
        }
      >
        <Section title="Adjustment">
          <Segmented
            value={dir}
            onChange={(d) => {
              setDir(d);
              setReason(REASONS[d][0]);
            }}
            options={[
              { value: "remove", label: "Remove stock" },
              { value: "add", label: "Add stock" },
            ]}
            className="mb-4"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Quantity (${item.unit})`}>
              <Input type="number" min={1} max={dir === "remove" ? item.qty : undefined} value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus className="tabular" />
            </Field>
            <Field label="Reason">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS[dir].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
            <Field label="Note (optional)" className="sm:col-span-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Carton crushed during unloading" />
            </Field>
          </div>
        </Section>
        <div className="flex items-center justify-between rounded-lg bg-canvas px-4 py-3 text-sm">
          <span className="text-muted">Balance after adjustment</span>
          <span className={`tabular font-semibold ${after < 0 ? "text-rose-600" : "text-ink"}`}>
            {fmtQty(item.qty)} → {fmtQty(after)} {item.unit}
          </span>
        </div>
        <FormError error={error} />
      </DrawerLayout>
    </form>
  );
}
