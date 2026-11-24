import { Armchair, Monitor, PenLine, Router, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

const tints = [
  "bg-indigo-100 text-indigo-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

/** Initials on a tint that is stable per name, so a contact always looks the same. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ring-2 ring-white",
        size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-11 text-sm" : "size-8 text-[11px]",
        tints[hash(name) % tints.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

const categoryStyle: Record<Category, { icon: React.ElementType; cls: string }> = {
  Electronics: { icon: Monitor, cls: "from-indigo-50 to-indigo-100 text-indigo-600 ring-indigo-200/70" },
  Networking: { icon: Router, cls: "from-sky-50 to-sky-100 text-sky-600 ring-sky-200/70" },
  Electrical: { icon: Zap, cls: "from-amber-50 to-amber-100 text-amber-600 ring-amber-200/70" },
  Stationery: { icon: PenLine, cls: "from-rose-50 to-rose-100 text-rose-600 ring-rose-200/70" },
  Furniture: { icon: Armchair, cls: "from-emerald-50 to-emerald-100 text-emerald-600 ring-emerald-200/70" },
};

/** A small product tile: the category's icon on its tint. */
export function ItemThumb({ category, size = "md", className }: { category: Category; size?: "sm" | "md" | "lg"; className?: string }) {
  const { icon: Icon, cls } = categoryStyle[category];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-inset",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : size === "lg" ? "size-12 rounded-xl [&_svg]:size-6" : "size-9 [&_svg]:size-[18px]",
        cls,
        className,
      )}
    >
      <Icon strokeWidth={1.8} />
    </span>
  );
}
