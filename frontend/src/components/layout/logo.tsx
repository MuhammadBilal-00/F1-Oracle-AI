import { cn } from "@/lib/utils";

/** The F1 Oracle wordmark / monogram. */
export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-accent shadow-[0_0_20px_-4px] shadow-accent/60">
        <span className="text-[15px] font-black italic leading-none text-white">F1</span>
      </div>
      {!mark && (
        <div className="leading-none">
          <p className="text-sm font-semibold tracking-tight text-foreground">Oracle</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-faint">AI Platform</p>
        </div>
      )}
    </div>
  );
}
