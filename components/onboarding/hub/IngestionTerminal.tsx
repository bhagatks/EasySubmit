"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { IngestionLogLine } from "@/lib/resume/ingestionLog";
import { cn } from "@/lib/utils";

const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";

type IngestionTerminalProps = {
  lines: IngestionLogLine[];
  monoClass: string;
  className?: string;
};

function prefixColor(prefix: IngestionLogLine["prefix"]): string {
  switch (prefix) {
    case "[OK]":
      return MINT;
    case "[INGESTING]":
      return "oklch(0.62 0.21 265)";
    case "[MAPPING]":
      return "oklch(0.72 0.14 265)";
    case "[SYNC]":
      return MINT;
    default:
      return MUTED;
  }
}

export function IngestionTerminal({
  lines,
  monoClass,
  className,
}: IngestionTerminalProps) {
  if (lines.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-4 overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.12_0.03_268)]",
        className,
      )}
      role="log"
      aria-live="polite"
      aria-label="Ingestion log"
    >
      <div
        className={cn(
          monoClass,
          "border-b border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.16em]",
        )}
        style={{ color: MUTED }}
      >
        Engine Log
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-2"
            >
              <span
                className="shrink-0 font-semibold"
                style={{ color: prefixColor(line.prefix) }}
              >
                {line.prefix}
              </span>
              <span
                style={{
                  color:
                    line.status === "pending"
                      ? "oklch(0.35 0.02 268)"
                      : "oklch(0.85 0.02 268)",
                }}
              >
                {line.message}
                {line.status === "active" ? (
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    …
                  </motion.span>
                ) : null}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
