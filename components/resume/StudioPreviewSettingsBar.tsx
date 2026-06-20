"use client";

import { FontSelect } from "@/components/resume/FontSelect";
import { PageSizeSelect } from "@/components/resume/PageSizeSelect";
import { PreviewZoomControls } from "@/components/resume/PreviewZoomControls";
import type { ResumeFontId } from "@/lib/resume/resume-fonts";
import type { PageSizeId } from "@/lib/resume/page-sizes";
import { cn } from "@/lib/utils";

type StudioPreviewSettingsBarProps = {
  fontId: ResumeFontId;
  pageSizeId: PageSizeId;
  onFontChange: (id: ResumeFontId) => void;
  onPageSizeChange: (id: PageSizeId) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  className?: string;
};

export function StudioPreviewSettingsBar({
  fontId,
  pageSizeId,
  onFontChange,
  onPageSizeChange,
  zoom,
  onZoomChange,
  variant = "dashboard",
  monoClass,
  className,
}: StudioPreviewSettingsBarProps) {
  const isOnboarding = variant === "onboarding";
  const onboardingControlClass =
    "border-white/10 bg-white/[0.04] text-[oklch(0.98_0.01_268)] focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:ring-[oklch(0.62_0.21_265_/_0.35)]";
  const onboardingLabelClass = "text-[oklch(0.65_0.02_268)]";

  return (
    <div
      className={cn(
        "shrink-0 border-t px-4 py-3",
        isOnboarding
          ? "border-white/10 bg-[oklch(0.12_0.03_268)]"
          : "border-border bg-surface/95",
        className,
      )}
      aria-label="Preview display settings"
    >
      <p
        className={cn(
          monoClass,
          "mb-2.5 text-[10px] font-medium uppercase tracking-[0.16em]",
          isOnboarding ? "text-[oklch(0.55_0.02_268)]" : "text-muted-foreground",
        )}
      >
        Preview display
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <FontSelect
          value={fontId}
          onChange={onFontChange}
          monoClass={monoClass}
          selectClassName={isOnboarding ? onboardingControlClass : undefined}
          labelClassName={isOnboarding ? onboardingLabelClass : undefined}
        />
        <PageSizeSelect
          value={pageSizeId}
          onChange={onPageSizeChange}
          monoClass={monoClass}
          selectClassName={isOnboarding ? onboardingControlClass : undefined}
          labelClassName={isOnboarding ? onboardingLabelClass : undefined}
        />
        <PreviewZoomControls
          zoom={zoom}
          onChange={onZoomChange}
          variant={variant}
          monoClass={monoClass}
        />
      </div>
    </div>
  );
}
