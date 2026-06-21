"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import type { EnhanceWorkloadTier } from "@/src/lib/ai/engine/enhance-progress";
import { Button } from "@/components/ui/button";
import { GlossyModal } from "@/components/ui/glossy-modal";
import { cn } from "@/lib/utils";

export type EnhanceDialogProgress = {
  headline: string;
  detail?: string;
  tier: EnhanceWorkloadTier;
  progressRatio: number;
  estimatedLabel?: string;
};

type EnhanceWithAiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (jobDescription: string) => void;
  isLoading?: boolean;
  progress?: EnhanceDialogProgress | null;
};

export function EnhanceWithAiDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  progress = null,
}: EnhanceWithAiDialogProps) {
  const [jobDescription, setJobDescription] = useState("");

  const handleSubmit = () => {
    const trimmed = jobDescription.trim();
    logEnhance("client", "dialog.submit", {
      jobDescriptionChars: trimmed.length,
      hasJobDescription: Boolean(trimmed),
    });
    onSubmit(trimmed);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) {
      logEnhance("client", "dialog.cancel", { hadJobDescription: Boolean(jobDescription.trim()) });
      setJobDescription("");
    }
    onOpenChange(next);
  };

  const loadingHeadline = progress?.headline ?? "Enhancing your resume…";
  const loadingDetail = progress?.detail;
  const showProgressBar = isLoading && progress && progress.tier !== "light";
  const showLoadingPanel = isLoading;

  return (
    <GlossyModal
      open={open}
      onOpenChange={handleOpenChange}
      busy={isLoading}
      title="Enhance with AI"
      description={
        isLoading
          ? undefined
          : "We'll rewrite your resume for ATS impact using your target role and optional job details. Contact info stays unchanged — review changes before saving."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
            disabled={isLoading}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? "Enhancing…" : "Submit"}
          </Button>
        </div>
      }
    >
      {showLoadingPanel ? (
        <div
          className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">{loadingHeadline}</p>
              {loadingDetail ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{loadingDetail}</p>
              ) : null}
            </div>
          </div>
          {showProgressBar ? (
            <div className="space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.round(progress.progressRatio * 100)}%` }}
                />
              </div>
              {progress.estimatedLabel ? (
                <p className="text-[11px] text-muted-foreground">
                  Typical wait for this size: {progress.estimatedLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Optional job description
          </span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the job posting here to tailor your resume to a specific role…"
            rows={6}
            className={cn(
              "w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          />
        </label>
      )}
    </GlossyModal>
  );
}

type EnhanceWithAiButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: "dashboard" | "onboarding";
  className?: string;
};

export function EnhanceWithAiButton({
  onClick,
  disabled = false,
  isLoading = false,
  variant = "dashboard",
  className,
}: EnhanceWithAiButtonProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        "rounded-xl gap-2",
        isOnboarding
          ? "border border-white/15 bg-white/10 text-[oklch(0.97_0.01_250)] hover:bg-white/15"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
      variant={isOnboarding ? "ghost" : "default"}
    >
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isLoading ? "Enhancing…" : "Enhance with AI"}
    </Button>
  );
}
