"use client";

import {
  PIPELINE_STEPS,
  pipelineActiveBarSegmentLabel,
  pipelineActiveSegmentLabel,
  pipelineBarStepLabel,
  pipelineProgressForStatus,
} from "@/lib/job-tracker/pipeline-progress";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type PipelineBarProps = {
  status: JobTrackerStatus;
  className?: string;
};

export function PipelineBar({ status, className }: PipelineBarProps) {
  const progress = pipelineProgressForStatus(status);
  const activeLabel = pipelineActiveSegmentLabel(status);

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
          const fullLabel =
            isCurrent && activeLabel ? activeLabel : step.label;

          return (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full border transition-colors",
                isComplete
                  ? "border-mint/40 bg-mint/25"
                  : isCurrent
                    ? "border-primary/50 bg-primary/30 animate-pipe-glow"
                    : "border-border/60 bg-muted/25",
              )}
              title={fullLabel}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1 text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
        {PIPELINE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent =
            !progress.isComplete && progress.currentIndex === stepNumber;
          const fullLabel =
            isCurrent && activeLabel ? activeLabel : step.label;
          const activeBarLabel = pipelineActiveBarSegmentLabel(status);
          const displayLabel =
            isCurrent && activeBarLabel ? activeBarLabel : pipelineBarStepLabel(step);

          return (
            <span
              key={step.id}
              className={cn(
                "min-w-0 truncate",
                index === 0 && "text-left",
                index === lastStepIndex && "text-right",
                index > 0 && index < lastStepIndex && "text-center",
                isCurrent && "font-medium text-primary",
              )}
              title={fullLabel}
            >
              {displayLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
}
