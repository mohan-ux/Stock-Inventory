import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesView } from "@/components/views/sales";

export const metadata: Metadata = { title: "Sales" };

export default function Page() {
  return (
    <Suspense>
      <SalesView />
    </Suspense>
  );
}
