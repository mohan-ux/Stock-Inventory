"use client";

import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { PanelProvider } from "@/components/shell/panels";
import { AppShell } from "@/components/shell/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider fallback={<Loading />}>
      <ToastProvider>
        <PanelProvider>
          <AppShell>{children}</AppShell>
        </PanelProvider>
      </ToastProvider>
    </StoreProvider>
  );
}

/** Shown for the instant before sample data loads from this browser. */
function Loading() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[252px] bg-nav lg:block" />
      <div className="flex-1 px-4 py-9 sm:px-6 lg:px-10">
        <div className="h-7 w-48 animate-pulse rounded-md bg-ink/[0.06]" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
        <div className="mt-4 h-80 animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    </div>
  );
}
