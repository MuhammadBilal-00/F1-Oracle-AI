"use client";

import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const Select = RS.Root;
export const SelectValue = RS.Value;

export function SelectTrigger({
  className,
  children,
  size = "md",
}: {
  className?: string;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <RS.Trigger
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 text-foreground",
        "transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/20 data-[state=open]:border-accent/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
        className,
      )}
    >
      {children}
      <RS.Icon asChild>
        <ChevronDown className="size-4 text-subtle" />
      </RS.Icon>
    </RS.Trigger>
  );
}

export function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RS.Portal>
      <RS.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-50 max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border-strong bg-elevated shadow-xl",
          className,
        )}
      >
        <RS.Viewport className="p-1.5">{children}</RS.Viewport>
      </RS.Content>
    </RS.Portal>
  );
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RS.Item
      value={value}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-3 pr-8 text-sm text-muted outline-none",
        "data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground data-[state=checked]:text-foreground",
      )}
    >
      <RS.ItemText>{children}</RS.ItemText>
      <RS.ItemIndicator className="absolute right-2.5">
        <Check className="size-3.5 text-accent" />
      </RS.ItemIndicator>
    </RS.Item>
  );
}
