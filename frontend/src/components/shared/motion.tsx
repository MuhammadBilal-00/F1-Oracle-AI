"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Subtle fade-up entrance. Used to stagger page sections without ceremony. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 12,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
