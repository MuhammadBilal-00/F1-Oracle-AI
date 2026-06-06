"use client";

import * as RT from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <RT.Provider delayDuration={150}>
      <RT.Root>
        <RT.Trigger asChild>{children}</RT.Trigger>
        <RT.Portal>
          <RT.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-lg border border-border-strong bg-elevated px-2.5 py-1.5 text-xs text-foreground shadow-lg",
              className,
            )}
          >
            {content}
            <RT.Arrow className="fill-elevated" />
          </RT.Content>
        </RT.Portal>
      </RT.Root>
    </RT.Provider>
  );
}
