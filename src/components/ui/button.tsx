import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background,box-shadow,color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(79_70_229/0.3)] hover:bg-brand-700",
  secondary: "border border-line bg-surface text-ink-2 shadow-card hover:border-line-strong hover:text-ink",
  ghost: "text-ink-2 hover:bg-ink/[0.05] hover:text-ink",
  danger: "border border-rose-200 bg-surface text-rose-600 shadow-card hover:border-rose-300 hover:bg-rose-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

type Props = { variant?: Variant; size?: Size } & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: Props) {
  return <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: { variant?: Variant; size?: Size } & React.ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}

export function IconButton({ className, label, ...rest }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 [&_svg]:size-4",
        className,
      )}
      {...rest}
    />
  );
}
