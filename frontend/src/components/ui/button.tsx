import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 hover:shadow-[0_0_24px_-4px] hover:shadow-accent/50",
        secondary: "bg-surface-2 text-foreground border border-border hover:bg-elevated hover:border-border-strong",
        ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
        outline: "border border-border-strong text-foreground hover:bg-surface-2",
        light: "bg-foreground text-background hover:bg-foreground/90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}
