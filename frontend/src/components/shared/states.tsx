import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-subtle">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-[13px] text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={message ?? "Could not load this data. Make sure the F1 Oracle API is running."}
      className={cn("border-negative/30", className)}
    />
  );
}
