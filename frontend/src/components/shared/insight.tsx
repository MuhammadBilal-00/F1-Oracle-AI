import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type InsightTone = "neutral" | "accent" | "positive" | "negative" | "info" | "warning" | "gold" | "violet";

const toneRing: Record<InsightTone, string> = {
  neutral: "text-subtle",
  accent: "text-accent",
  positive: "text-positive",
  negative: "text-negative",
  info: "text-info",
  warning: "text-warning",
  gold: "text-gold",
  violet: "text-violet",
};

/** A single AI-generated insight line. */
export function Insight({
  children,
  tone = "neutral",
  title,
  className,
}: {
  children: ReactNode;
  tone?: InsightTone;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border bg-surface-2/60 p-4",
        className,
      )}
    >
      <Sparkles className={cn("mt-0.5 size-4 shrink-0", toneRing[tone])} />
      <div className="space-y-0.5">
        {title && <p className="text-sm font-medium text-foreground">{title}</p>}
        <p className="text-[13px] leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}
