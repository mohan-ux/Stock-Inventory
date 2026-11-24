import type { Metadata } from "next";
import { Suspense } from "react";
import { StockView } from "@/components/views/stock";

export const metadata: Metadata = { title: "Stock" };

export default function Page() {
  return (
    <Suspense>
      <StockView />
    </Suspense>
  );
}
