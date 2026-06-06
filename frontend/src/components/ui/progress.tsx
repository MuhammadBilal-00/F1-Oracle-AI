"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressProps {
  /** 0..1 */
  value: number;
  className?: string;
  barClassName?: string;
  /** Tailwind color for the fill, e.g. "bg-accent". */
  color?: string;
  height?: number;
  animate?: boolean;
}

/** A thin probability/percentage bar with an animated fill. */
export function Progress({
  value,
  className,
  barClassName,
  color = "bg-accent",
  height = 6,
  animate = true,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(1, value || 0));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-white/8", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", color, barClassName)}
        initial={animate ? { width: 0 } : false}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
