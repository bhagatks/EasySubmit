"use client";

import { Minus, Plus } from "lucide-react";
import { ReviewPreviewChromeButton } from "@/components/dashboard/review/ReviewPreviewChromeButton";
import { stepStudioZoom } from "@/lib/resume/studio-preview-zoom";
import { cn } from "@/lib/utils";

type ReviewPreviewZoomControlsProps = {
  zoom: number;
  onChange: (zoom: number) => void;
  className?: string;
};

export function ReviewPreviewZoomControls({
  zoom,
  onChange,
  className,
}: ReviewPreviewZoomControlsProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      aria-label="Preview zoom"
    >
      <ReviewPreviewChromeButton
        iconOnly
        title="Zoom out"
        aria-label="Zoom out"
        onClick={() => onChange(stepStudioZoom(zoom, "out"))}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </ReviewPreviewChromeButton>
      <ReviewPreviewChromeButton
        iconOnly
        title="Zoom in"
        aria-label="Zoom in"
        onClick={() => onChange(stepStudioZoom(zoom, "in"))}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </ReviewPreviewChromeButton>
    </div>
  );
}
