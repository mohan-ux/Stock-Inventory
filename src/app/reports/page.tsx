import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsView } from "@/components/views/reports";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}
