import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground",
        "placeholder:text-faint transition-colors",
        "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
