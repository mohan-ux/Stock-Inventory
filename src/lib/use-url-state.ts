"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * A filter value kept in the URL, so filtered views can be linked to
 * (e.g. the dashboard's "low stock" card opens /stock?status=low) and survive
 * back/forward. The default value is left out of the URL.
 */
export function useUrlState<T extends string>(key: string, fallback: T, allowed?: readonly T[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get(key) as T | null;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const set = useCallback(
    (v: T) => {
      const next = new URLSearchParams(window.location.search);
      if (v === fallback) next.delete(key);
      else next.set(key, v);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, fallback, pathname, router],
  );

  return [value, set] as const;
}
