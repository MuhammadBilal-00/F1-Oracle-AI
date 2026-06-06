"use client";

import { ResponsiveContainer } from "recharts";
import type { ReactElement } from "react";

/** Thin wrapper enforcing a consistent chart height + responsive width. */
export function ChartBox({ height = 280, children }: { height?: number; children: ReactElement }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
