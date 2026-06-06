"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Polls the backend /health endpoint and renders a live status pill. */
export function AIStatus() {
  const root = API_BASE.replace(/\/api\/v1\/?$/, "");
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${root}/health`);
      if (!res.ok) throw new Error("down");
      return res.json() as Promise<{ status: string }>;
    },
    refetchInterval: 30_000,
    retry: 0,
  });

  const online = !!data && !isError;
  const color = isLoading ? "bg-warning" : online ? "bg-positive" : "bg-negative";
  const label = isLoading ? "Connecting" : online ? "AI Online" : "AI Offline";

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 sm:flex">
      <span className="relative flex size-2">
        {online && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", color)} />}
        <span className={cn("relative inline-flex size-2 rounded-full", color)} />
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </div>
  );
}
