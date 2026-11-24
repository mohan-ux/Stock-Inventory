"use client";

import { useStore } from "@/lib/store";
import type { MovementType as MT } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { usePanels } from "@/components/shell/panels";

export function MovementType({ type }: { type: MT }) {
  if (type === "IN") return <Badge tone="green">In</Badge>;
  if (type === "OUT") return <Badge tone="blue">Out</Badge>;
  return <Badge tone="violet">Adjust</Badge>;
}

/** A movement's reference (INV-…/PO-…) links to the document that caused it. */
export function MovementRef({ refNo }: { refNo: string }) {
  const { state } = useStore();
  const panels = usePanels();
  const sale = refNo.startsWith("INV-") && state.sales.find((s) => s.number === refNo);
  const po = refNo.startsWith("PO-") && state.purchases.find((p) => p.number === refNo);
  if (!sale && !po) return <span className="text-xs font-medium text-muted">{refNo === "ADJ" ? "Manual" : refNo === "OPENING" ? "Opening" : refNo}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        panels.push(sale ? { kind: "sale", id: sale.id } : { kind: "purchase", id: (po as { id: string }).id });
      }}
      className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
    >
      {refNo}
    </button>
  );
}
