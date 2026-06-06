"use client";

import * as RT from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const Tabs = RT.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RT.List>) {
  return (
    <RT.List
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-subtle transition-colors",
        "hover:text-muted focus-visible:outline-none",
        "data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RT.Content>) {
  return <RT.Content className={cn("focus-visible:outline-none", className)} {...props} />;
}
