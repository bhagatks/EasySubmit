"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CALIBRATION_DURATION_S = 2.5;

type CalibrationPulseProps = {
  active: boolean;
  targetTitle?: string | null;
  className?: string;
};

const NODES = [
  { id: "a", x: 18, y: 28 },
  { id: "b", x: 50, y: 22 },
  { id: "c", x: 82, y: 32 },
  { id: "d", x: 35, y: 58 },
  { id: "e", x: 68, y: 62 },
] as const;

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [3, 4],
  [2, 4],
];

/** Neural mapping overlay — connecting nodes over resume paper (Phase 4). */
export function CalibrationPulse({
  active,
  targetTitle,
  className,
}: CalibrationPulseProps) {
  if (!active) return null;

  const label = targetTitle?.trim()
    ? `Launching profile for ${targetTitle.trim()}…`
    : "Launching your profile…";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0 z-10"
        style={{ backgroundColor: "oklch(0.62 0.21 265 / 0.1)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.3, 0.55, 0.2] }}
        transition={{ duration: CALIBRATION_DURATION_S, ease: "easeInOut" }}
      />

      <svg
        className="absolute inset-0 z-20 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {EDGES.map(([from, to], index) => {
          const a = NODES[from];
          const b = NODES[to];
          return (
            <motion.line
              key={`edge-${index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="oklch(0.62 0.21 265)"
              strokeWidth="0.35"
              strokeOpacity="0.55"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.8, 0.5] }}
              transition={{
                duration: CALIBRATION_DURATION_S,
                delay: index * 0.08,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 z-[25]">
        {NODES.map((node, index) => (
          <motion.span
            key={node.id}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_12px_oklch(0.62_0.21_265)]"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              backgroundColor: "oklch(0.62 0.21 265)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.85] }}
            transition={{
              duration: 0.5,
              delay: index * 0.12,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-8 px-6 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [0, 1, 1, 0.6], y: [8, 0, 0, -2] }}
        transition={{ duration: CALIBRATION_DURATION_S, ease: "easeInOut" }}
      >
        <p className="max-w-[18rem] text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.98_0.01_268)]">
          {label}
        </p>
      </motion.div>
    </div>
  );
}
