"use client";

import {
  PIPELINE_STEPS,
  pipelineBarStepLabel,
  pipelineProgressForStatus,
  type PipelineProgress,
} from "@/lib/job-tracker/pipeline-progress";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type PipelineBarProps = {
  status: JobTrackerStatus;
  className?: string;
  /** When set, overrides status-only segment fill (e.g. stage failure). */
  progress?: PipelineProgress;
  /** Highlight the active segment as failed. */
  stageFailed?: boolean;
};

export function PipelineBar({
  status,
  className,
  progress: progressOverride,
  stageFailed = false,
}: PipelineBarProps) {
  const progress = progressOverride ?? pipelineProgressForStatus(status);
  const lastStepIndex = PIPELINE_STEPS.length - 1;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="grid grid-cols-4 gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={PIPELINE_STEPS.length}
        aria-valuenow={progress.filledThrough}
        aria-label="Application progress"
      >
        {PIPELINE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete =
            progress.isComplete || stepNumber <= progress.filledThrough;
          const isCurrent =
            !progress.isComplete && progress.currentIndex === stepNumber;
          const label = pipelineBarStepLabel(step);

          return (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full border transition-colors",
                isComplete
                  ? "border-mint/40 bg-mint/25"
                  : isCurrent
                    ? stageFailed
                      ? "border-destructive/60 bg-destructive/35 animate-pipe-glow"
                      : "border-primary/50 bg-primary/30 animate-pipe-glow"
                    : "border-primary/35 bg-primary/5",
              )}
              title={label}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1 text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
        {PIPELINE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete =
            progress.isComplete || stepNumber <= progress.filledThrough;
          const isCurrent =
            !progress.isComplete && progress.currentIndex === stepNumber;
          const isPending = !isComplete && !isCurrent;
          const displayLabel = pipelineBarStepLabel(step);

          return (
            <span
              key={step.id}
              className={cn(
                "min-w-0 truncate",
                index === 0 && "text-left",
                index === lastStepIndex && "text-right",
                index > 0 && index < lastStepIndex && "text-center",
                isCurrent && stageFailed && "font-medium text-destructive",
                isCurrent && !stageFailed && "font-medium text-primary",
                isPending && "text-primary/45",
              )}
              title={displayLabel}
            >
              {displayLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
}
