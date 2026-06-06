"use client";

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboItem {
  value: string;
  label: string;
  sublabel?: string;
  keywords?: string[];
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
  emptyText = "No results.",
}: {
  items: ComboItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((i) => i.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-border-strong",
          "focus:outline-none focus:ring-2 focus:ring-accent/20 data-[open=true]:border-accent/50",
        )}
        data-open={open}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border-strong bg-elevated shadow-xl">
          <Command className="w-full" loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 text-subtle" />
              <Command.Input
                autoFocus
                placeholder={searchPlaceholder}
                className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
              />
            </div>
            <Command.List className="max-h-[280px] overflow-y-auto p-1.5">
              <Command.Empty className="py-6 text-center text-sm text-subtle">{emptyText}</Command.Empty>
              {items.map((item) => (
                <Command.Item
                  key={item.value}
                  value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                  onSelect={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground"
                >
                  <Check className={cn("size-3.5 text-accent", item.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.sublabel && <span className="text-xs text-faint">{item.sublabel}</span>}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
