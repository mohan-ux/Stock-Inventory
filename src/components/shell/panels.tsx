"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Line } from "@/lib/types";
import { Drawer } from "@/components/ui/drawer";
import { SaleDetail } from "@/components/drawers/sale-detail";
import { PurchaseDetail } from "@/components/drawers/purchase-detail";
import { ItemDetail } from "@/components/drawers/item-detail";
import { PartyDetail } from "@/components/drawers/party-detail";
import { SaleForm } from "@/components/forms/sale-form";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { ItemForm } from "@/components/forms/item-form";
import { AdjustForm } from "@/components/forms/adjust-form";

/**
 * Every record and form opens in one drawer, managed here. Panels form a
 * stack, so "Item → Reorder → back" returns to the item you came from.
 */
export type Panel =
  | { kind: "sale"; id: string }
  | { kind: "purchase"; id: string }
  | { kind: "item"; id: string }
  | { kind: "customer"; id: string }
  | { kind: "supplier"; id: string }
  | { kind: "newSale"; customerId?: string; itemId?: string }
  | { kind: "newPurchase"; supplierId?: string; lines?: Line[] }
  | { kind: "newItem" }
  | { kind: "editItem"; id: string }
  | { kind: "adjust"; itemId: string };

interface PanelApi {
  /** Open a panel, replacing whatever is open. */
  open: (p: Panel) => void;
  /** Open a panel on top of the current one (Back returns). */
  push: (p: Panel) => void;
  /** Swap the top panel, e.g. a finished form for the record it created. */
  replace: (p: Panel) => void;
  back: () => void;
  close: () => void;
}

const PanelContext = createContext<PanelApi | null>(null);

export function usePanels() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanels must be used inside <PanelProvider>");
  return ctx;
}

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Panel[]>([]);

  const close = useCallback(() => setStack([]), []);
  const api = useMemo<PanelApi>(
    () => ({
      open: (p) => setStack([p]),
      push: (p) => setStack((s) => [...s, p]),
      replace: (p) => setStack((s) => [...s.slice(0, -1), p]),
      back: () => setStack((s) => s.slice(0, -1)),
      close,
    }),
    [close],
  );

  const top = stack.at(-1);
  return (
    <PanelContext.Provider value={api}>
      {children}
      <Drawer open={!!top} onClose={close} onBack={stack.length > 1 ? api.back : undefined}>
        {/* key resets form state when the panel changes */}
        {top && <PanelBody key={`${stack.length}-${JSON.stringify(top)}`} panel={top} />}
      </Drawer>
    </PanelContext.Provider>
  );
}

function PanelBody({ panel }: { panel: Panel }) {
  switch (panel.kind) {
    case "sale":
      return <SaleDetail id={panel.id} />;
    case "purchase":
      return <PurchaseDetail id={panel.id} />;
    case "item":
      return <ItemDetail id={panel.id} />;
    case "customer":
      return <PartyDetail kind="customer" id={panel.id} />;
    case "supplier":
      return <PartyDetail kind="supplier" id={panel.id} />;
    case "newSale":
      return <SaleForm customerId={panel.customerId} itemId={panel.itemId} />;
    case "newPurchase":
      return <PurchaseForm supplierId={panel.supplierId} lines={panel.lines} />;
    case "newItem":
      return <ItemForm />;
    case "editItem":
      return <ItemForm id={panel.id} />;
    case "adjust":
      return <AdjustForm itemId={panel.itemId} />;
  }
}
