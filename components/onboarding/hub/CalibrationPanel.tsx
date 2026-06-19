"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { getWorkbenchPhase, workbenchPhaseHeader } from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";

const ACCENT = "oklch(0.82 0.16 165)";
const PRIMARY = "oklch(0.62 0.21 265)";
const MUTED = "oklch(0.45 0.02 268)";

type CalibrationPanelProps = {
  targetTitle?: string | null;
  monoClass: string;
};

/** Phase 4 right panel — launch sequence before dashboard. */
export function CalibrationPanel({ targetTitle, monoClass }: CalibrationPanelProps) {
  const label = targetTitle?.trim()
    ? `Preparing ${targetTitle.trim()} for applications`
    : "Preparing your profile for applications";

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <p
        className={cn(monoClass, "text-[11px] font-medium uppercase tracking-[0.2em]")}
        style={{ color: PRIMARY }}
      >
        <Activity className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
        {workbenchPhaseHeader(4)}
      </p>

      <motion.div
        className="relative mt-10 flex h-28 w-28 items-center justify-center rounded-full"
        animate={{
          boxShadow: [
            "0 0 0 0 oklch(0.82 0.16 165 / 0.45)",
            "0 0 0 18px oklch(0.82 0.16 165 / 0)",
            "0 0 0 0 oklch(0.82 0.16 165 / 0.45)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: "oklch(0.82 0.16 165 / 0.55)",
            backgroundColor: "oklch(0.82 0.16 165 / 0.08)",
          }}
        />
        <motion.div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: ACCENT }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <h2
        className="mt-8 font-display text-xl font-semibold tracking-tight sm:text-2xl"
        style={{ color: "oklch(0.98 0.01 268)" }}
      >
        {getWorkbenchPhase(4)?.headline ?? "Launching your profile"}
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: MUTED }}>
        {label}. {getWorkbenchPhase(4)?.description}
      </p>

      <p
        className={cn(monoClass, "mt-8 text-[10px] uppercase tracking-[0.16em]")}
        style={{ color: ACCENT }}
      >
        Redirecting in a moment…
      </p>
    </div>
  );
}
