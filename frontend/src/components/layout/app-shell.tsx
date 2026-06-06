"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar, MobileSidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { useUI } from "@/store/ui-store";

export function AppShell({ children }: { children: ReactNode }) {
  const sidebarPinned = useUI((s) => s.sidebarPinned);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Rail width is fixed (72) when collapsed, 260 when pinned; hover-expansion floats over content.
  const rail = !mounted ? 260 : sidebarPinned ? 260 : 72;

  return (
    <div className="relative min-h-screen">
      {/* Ambient top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 opacity-60"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255,46,63,0.10) 0%, transparent 70%)",
        }}
      />
      <Sidebar />
      <MobileSidebar />

      <div
        style={{ "--rail": `${rail}px` } as CSSProperties}
        className="transition-[padding] duration-300 ease-out-soft lg:pl-[var(--rail)]"
      >
        <TopBar />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
