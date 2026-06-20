"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  DEFAULT_STUDIO_ZOOM,
  formatStudioZoomPercent,
  stepStudioZoom,
} from "@/lib/resume/studio-preview-zoom";
import { cn } from "@/lib/utils";

type PreviewZoomControlsProps = {
  zoom: number;
  onChange: (zoom: number) => void;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
};

export function PreviewZoomControls({
  zoom,
  onChange,
  variant = "dashboard",
  monoClass,
}: PreviewZoomControlsProps) {
  const isOnboarding = variant === "onboarding";
  const buttonClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    isOnboarding
      ? "border-white/10 bg-white/[0.04] text-[oklch(0.98_0.01_268)] hover:border-[oklch(0.62_0.21_265_/_0.35)]"
      : "border-border bg-surface text-foreground hover:border-mint/40",
  );

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          monoClass,
          "shrink-0 text-xs uppercase tracking-[0.12em]",
          isOnboarding ? "text-[oklch(0.65_0.02_268)]" : "text-muted-foreground",
        )}
      >
        Zoom
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={buttonClass}
          aria-label="Zoom out"
          onClick={() => onChange(stepStudioZoom(zoom, "out"))}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span
          className={cn(
            monoClass,
            "min-w-[3rem] text-center text-xs tabular-nums",
            isOnboarding ? "text-[oklch(0.85_0.02_268)]" : "text-foreground",
          )}
        >
          {formatStudioZoomPercent(zoom)}
        </span>
        <button
          type="button"
          className={buttonClass}
          aria-label="Zoom in"
          onClick={() => onChange(stepStudioZoom(zoom, "in"))}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-label="Reset zoom to 100%"
          disabled={zoom === DEFAULT_STUDIO_ZOOM}
          onClick={() => onChange(DEFAULT_STUDIO_ZOOM)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
