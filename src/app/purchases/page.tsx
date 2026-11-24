import type { Metadata } from "next";
import { Suspense } from "react";
import { PurchasesView } from "@/components/views/purchases";

export const metadata: Metadata = { title: "Purchases" };

export default function Page() {
  return (
    <Suspense>
      <PurchasesView />
    </Suspense>
  );
}
