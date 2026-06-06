"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { NAV, SETTINGS_ITEM } from "@/lib/nav";
import { useDrivers } from "@/hooks/use-f1";
import { flag } from "@/lib/format";

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { data: drivers } = useDrivers();
  const [query, setQuery] = useState("");

  // Global ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  const driverMatches = (drivers ?? [])
    .filter((d) => d.full_name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-xl">
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <Command shouldFilter={false} className="w-full">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-subtle" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search pages and drivers…"
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-faint sm:block">ESC</kbd>
            </div>
            <Command.List className="max-h-[55vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-subtle">
                No results found.
              </Command.Empty>

              <Command.Group heading="Pages" className="px-1 text-[11px] font-medium uppercase tracking-wider text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {[...NAV, SETTINGS_ITEM]
                  .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()) || query === "")
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.href}
                        value={item.href}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground"
                      >
                        <Icon className="size-4 text-subtle" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-xs text-faint">{item.description}</span>
                      </Command.Item>
                    );
                  })}
              </Command.Group>

              {driverMatches.length > 0 && (
                <Command.Group heading="Drivers" className="mt-1 px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-faint">
                  {driverMatches.map((d) => (
                    <Command.Item
                      key={d.driver_id}
                      value={`driver-${d.driver_id}`}
                      onSelect={() => go(`/drivers?driver=${d.driver_id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground"
                    >
                      <span>{flag(d.nationality)}</span>
                      <span className="flex-1">{d.full_name}</span>
                      <span className="text-xs text-faint">{d.nationality}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
