"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { useSeasons } from "@/hooks/use-f1";
import { useUI } from "@/store/ui-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIStatus } from "./ai-status";
import { CommandMenu } from "./command-menu";

function SeasonSelect() {
  const { season, setSeason } = useUI();
  const { data: seasons } = useSeasons();
  const list = seasons ?? [season];
  return (
    <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
      <SelectTrigger size="sm" className="w-[112px]">
        <span className="text-xs text-subtle">Season</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TopBar() {
  const { setMobileOpen } = useUI();
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
        <button
          onClick={() => setMobileOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <button
          onClick={() => setCmdOpen(true)}
          className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 text-left text-sm text-faint transition-colors hover:border-border-strong sm:max-w-xs"
        >
          <Search className="size-4" />
          <span className="flex-1 truncate">Search drivers, pages…</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:block">⌘K</kbd>
        </button>

        <div className="flex flex-1 items-center justify-end gap-3">
          <AIStatus />
          <SeasonSelect />
          <button
            className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent/60 text-xs font-semibold text-white"
            aria-label="Account"
            title="Guest — local session"
          >
            GP
          </button>
        </div>
      </header>

      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
