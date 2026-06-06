import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  delta,
  accent = "text-foreground",
  loading,
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  delta?: { value: string; positive: boolean };
  accent?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-subtle">{label}</p>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-subtle">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className={cn("mt-2 text-2xl font-semibold tracking-tight tnum sm:text-[28px]", accent)}>
          {value}
        </p>
      )}
      <div className="mt-1 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta.positive ? "text-positive" : "text-negative",
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {delta.value}
          </span>
        )}
        {sublabel && <span className="text-xs text-faint">{sublabel}</span>}
      </div>
    </Card>
  );
}
