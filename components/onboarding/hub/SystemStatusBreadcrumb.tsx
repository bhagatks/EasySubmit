"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { WORKBENCH_PHASES } from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";

export type WorkbenchPhase = {
  id: number;
  label: string;
  code: string;
};

export { WORKBENCH_PHASES };

type SystemStatusBreadcrumbProps = {
  currentStep: number;
  monoClass: string;
  isCalibrating?: boolean;
  /** Phases below this index cannot be navigated to (e.g. 2 locks Phase 1 after Import). */
  minNavigablePhase?: number;
  onNavigate?: (step: number) => void;
};

export function SystemStatusBreadcrumb({
  currentStep,
  monoClass,
  isCalibrating = false,
  minNavigablePhase = 1,
  onNavigate,
}: SystemStatusBreadcrumbProps) {
  const activeStep = isCalibrating ? 4 : currentStep;

  return (
    <nav aria-label="System status" className="flex flex-wrap items-center gap-1">
      <span
        className={cn(monoClass, "mr-2 text-[10px] font-medium uppercase tracking-[0.18em]")}
        style={{ color: "oklch(0.45 0.02 268)" }}
      >
        System Status
      </span>

      {WORKBENCH_PHASES.map((phase, index) => {
        const isComplete = phase.id < activeStep;
        const isCurrent = phase.id === activeStep;
        const canNavigate =
          Boolean(onNavigate) &&
          phase.id < currentStep &&
          phase.id >= minNavigablePhase &&
          !isCalibrating;

        return (
          <div key={phase.id} className="flex items-center">
            {index > 0 ? (
              <ChevronRight
                className="mx-1 h-3 w-3 shrink-0"
                style={{ color: "oklch(0.35 0.02 268)" }}
                aria-hidden="true"
              />
            ) : null}

            <button
              type="button"
              disabled={!canNavigate}
              onClick={() => canNavigate && onNavigate?.(phase.id)}
              className={cn(
                monoClass,
                "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors",
                canNavigate && "hover:bg-white/[0.06]",
                !canNavigate && "cursor-default",
              )}
              style={{
                color: isCurrent
                  ? "oklch(0.82 0.16 165)"
                  : isComplete
                    ? "oklch(0.62 0.21 265)"
                    : "oklch(0.45 0.02 268)",
              }}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isComplete ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    isCurrent && "animate-pulse",
                  )}
                  style={{
                    backgroundColor: isCurrent
                      ? "oklch(0.82 0.16 165)"
                      : "oklch(0.45 0.02 268)",
                  }}
                  aria-hidden="true"
                />
              )}
              {phase.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
