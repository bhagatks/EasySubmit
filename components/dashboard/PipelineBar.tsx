"use client";

import { PIPELINE_STEPS, pipelineProgressForStatus } from "@/lib/job-tracker/pipeline-progress";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type PipelineBarProps = {
  status: JobTrackerStatus;
  className?: string;
};

export function PipelineBar({ status, className }: PipelineBarProps) {
  const progress = pipelineProgressForStatus(status);

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="flex gap-1"
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

          return (
            <div
              key={step.id}
              className={cn(
                "h-1.5 flex-1 rounded-full border transition-colors",
                isComplete
                  ? "border-mint/40 bg-mint/25"
                  : isCurrent
                    ? "border-primary/50 bg-primary/30 animate-pipe-glow"
                    : "border-border/60 bg-muted/25",
              )}
              title={step.label}
            />
          );
        })}
      </div>
      <div className="flex gap-1 text-[10px] text-muted-foreground">
        {PIPELINE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent =
            !progress.isComplete && progress.currentIndex === stepNumber;

          return (
            <span
              key={step.id}
              className={cn(
                "flex-1 truncate text-left",
                isCurrent && "font-medium text-primary",
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
