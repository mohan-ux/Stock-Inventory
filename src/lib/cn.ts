import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the project's custom theme tokens so that, e.g.,
// `text-ink-2` and `text-brand-600` are recognised as conflicting colours.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ["canvas", "surface", "line", "line-strong", "ink", "ink-2", "muted", "faint", "brand-50", "brand-100", "brand-500", "brand-600", "brand-700"],
      shadow: ["card", "pop"],
    },
  },
});

/** Join class names; later Tailwind classes win over conflicting earlier ones. */
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
