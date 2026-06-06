"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  /** Sidebar pinned-expanded (desktop). When false it collapses to icons and expands on hover. */
  sidebarPinned: boolean;
  togglePinned: () => void;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Globally selected season, shared across pages via the top bar. */
  season: number;
  setSeason: (year: number) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarPinned: true,
      togglePinned: () => set((s) => ({ sidebarPinned: !s.sidebarPinned })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
      season: 2023,
      setSeason: (year) => set({ season: year }),
    }),
    {
      name: "f1-oracle-ui",
      partialize: (s) => ({ sidebarPinned: s.sidebarPinned, season: s.season }),
    },
  ),
);
