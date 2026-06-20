"use client";

import { Minus, Plus } from "lucide-react";
import { stepStudioZoom } from "@/lib/resume/studio-preview-zoom";
import { cn } from "@/lib/utils";

type PreviewZoomOverlayProps = {
  zoom: number;
  onChange: (zoom: number) => void;
  variant?: "onboarding" | "dashboard";
};

export function PreviewZoomOverlay({
  zoom,
  onChange,
  variant = "dashboard",
}: PreviewZoomOverlayProps) {
  const isOnboarding = variant === "onboarding";
  const buttonClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    isOnboarding
      ? "bg-[oklch(0.12_0.03_268/0.55)] text-[oklch(0.98_0.01_268)] backdrop-blur-sm hover:bg-[oklch(0.12_0.03_268/0.75)]"
      : "bg-background/55 text-foreground backdrop-blur-sm hover:bg-background/75",
  );

  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1"
      aria-label="Preview zoom"
    >
      <button
        type="button"
        className={cn(buttonClass, "pointer-events-auto")}
        aria-label="Zoom out"
        onClick={() => onChange(stepStudioZoom(zoom, "out"))}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(buttonClass, "pointer-events-auto")}
        aria-label="Zoom in"
        onClick={() => onChange(stepStudioZoom(zoom, "in"))}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
