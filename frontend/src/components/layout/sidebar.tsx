"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { useUI } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Tooltip } from "@/components/ui/tooltip";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "group/nav relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-surface-2 text-foreground" : "text-subtle hover:bg-surface-2/60 hover:text-foreground",
        !expanded && "justify-center px-0",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
      )}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-subtle group-hover/nav:text-foreground")} />
      <span
        className={cn(
          "truncate transition-all duration-200",
          expanded ? "opacity-100" : "pointer-events-none w-0 opacity-0",
        )}
      >
        {item.label}
      </span>
    </Link>
  );

  return expanded ? link : <Tooltip side="right" content={item.label}>{link}</Tooltip>;
}

export function Sidebar() {
  const { sidebarPinned, togglePinned } = useUI();
  const [hovered, setHovered] = useState(false);
  const expanded = sidebarPinned || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: expanded ? 260 : 72 }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-overlay/80 backdrop-blur-xl transition-[width] duration-300 ease-out-soft lg:flex",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-border", expanded ? "px-5" : "justify-center px-0")}>
        <Logo mark={!expanded} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} expanded={expanded} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <NavLink item={SETTINGS_ITEM} expanded={expanded} />
        <button
          onClick={togglePinned}
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-subtle transition-colors hover:bg-surface-2/60 hover:text-foreground",
            !expanded && "justify-center px-0",
          )}
        >
          {sidebarPinned ? (
            <PanelLeftClose className="size-[18px] shrink-0" />
          ) : (
            <PanelLeftOpen className="size-[18px] shrink-0" />
          )}
          <span className={cn("truncate transition-all duration-200", expanded ? "opacity-100" : "w-0 opacity-0")}>
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}

/** Mobile drawer variant — full labels, controlled by the UI store. */
export function MobileSidebar() {
  const { mobileOpen, setMobileOpen } = useUI();
  const pathname = usePathname();

  return (
    <div className={cn("lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          mobileOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-border bg-overlay transition-transform duration-300 ease-out-soft",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {[...NAV, SETTINGS_ITEM].map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active ? "bg-surface-2 text-foreground" : "text-subtle hover:text-foreground",
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
                <Icon className={cn("size-[18px]", active ? "text-accent" : "text-subtle")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
