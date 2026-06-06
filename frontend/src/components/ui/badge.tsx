import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-muted border border-border",
        accent: "bg-accent-soft text-accent border border-accent/25",
        positive: "bg-positive/10 text-positive border border-positive/25",
        negative: "bg-negative/10 text-negative border border-negative/25",
        info: "bg-info/10 text-info border border-info/25",
        warning: "bg-warning/10 text-warning border border-warning/25",
        gold: "bg-gold/10 text-gold border border-gold/25",
        violet: "bg-violet/10 text-violet border border-violet/25",
        outline: "border border-border-strong text-subtle",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
