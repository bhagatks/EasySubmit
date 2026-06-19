"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ScanningBeamProps = {
  active: boolean;
  className?: string;
};

/** Primary laser scan overlay for resume paper during parse. */
export function ScanningBeam({ active, className }: ScanningBeamProps) {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]",
        className,
      )}
    >
      <motion.div
        className="absolute inset-x-0 z-10 h-20 -translate-y-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.62 0.21 265 / 0.12), oklch(0.99 0.002 268 / 0.4), oklch(0.62 0.21 265 / 0.12), transparent)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        className="absolute inset-x-0 z-20 h-px -translate-y-1/2 bg-primary/60 shadow-[0_0_12px_oklch(0.62_0.21_265_/_0.55)]"
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        className="absolute inset-0 z-[5]"
        style={{
          background:
            "repeating-linear-gradient(0deg, oklch(0.62 0.21 265 / 0.04) 0px, transparent 2px, transparent 6px)",
        }}
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
