"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { WORKBENCH_PHASES } from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";

export type WorkbenchPhase = {
  id: number;
  label: string;
  code: string;
};

export { WORKBENCH_PHASES };

const MINT = "oklch(0.82 0.16 165)";
const PRIMARY = "oklch(0.62 0.21 265)";

type SystemStatusBreadcrumbProps = {
  currentStep: number;
  className?: string;
  isCalibrating?: boolean;
  /** Phases below this index cannot be navigated to (e.g. 2 locks Phase 1 after Import). */
  minNavigablePhase?: number;
  /** Override default completion check (phase.id < activeStep). */
  isPhaseComplete?: (phaseId: number, activeStep: number) => boolean;
  onNavigate?: (step: number) => void;
};

export function SystemStatusBreadcrumb({
  currentStep,
  className,
  isCalibrating = false,
  minNavigablePhase = 1,
  isPhaseComplete,
  onNavigate,
}: SystemStatusBreadcrumbProps) {
  const activeStep = isCalibrating ? 4 : currentStep;

  return (
    <nav
      aria-label="Onboarding progress"
      className={cn("flex min-w-0 flex-1 items-stretch", className)}
    >
      {WORKBENCH_PHASES.map((phase, index) => {
        const isComplete = isPhaseComplete
          ? isPhaseComplete(phase.id, activeStep)
          : phase.id < activeStep;
        const isCurrent = phase.id === activeStep;
        const canNavigate =
          Boolean(onNavigate) &&
          phase.id < currentStep &&
          phase.id >= minNavigablePhase &&
          !isCalibrating;

        return (
          <button
            key={phase.id}
            type="button"
            disabled={!canNavigate}
            onClick={() => canNavigate && onNavigate?.(phase.id)}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              index > 0 && "border-l border-l-white/[0.06]",
              canNavigate && "hover:bg-white/[0.04] hover:text-foreground",
              !canNavigate && "cursor-default",
              isCurrent && "text-foreground",
              isComplete && !isCurrent && "text-foreground/75",
              !isCurrent && !isComplete && "text-muted-foreground",
            )}
            style={{
              borderBottomColor: isCurrent ? MINT : "transparent",
            }}
          >
            {isComplete ? (
              <Check
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: isCurrent ? MINT : PRIMARY }}
                aria-hidden="true"
              />
            ) : null}

            <span className="truncate">{phase.label}</span>

            {isCurrent ? (
              <motion.span
                layoutId="workbench-tab-glow"
                className="pointer-events-none absolute inset-x-3 -bottom-px h-4 bg-gradient-to-t from-[oklch(0.82_0.16_165_/_0.12)] to-transparent"
                aria-hidden="true"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
