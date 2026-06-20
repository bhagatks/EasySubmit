"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ResumePaginatedPreview } from "@/components/resume/ResumePaginatedPreview";
import { cn } from "@/lib/utils";

export const STUDIO_SPLIT_STORAGE_KEY = "easysubmit-studio-split-v1";
const DEFAULT_SPLIT = 50;

type ResumeStudioWorkbenchProps = {
  preview: ReactNode;
  panel: ReactNode;
  /** Optional overlay on preview canvas (e.g. ScanningBeam). */
  previewOverlay?: ReactNode;
  /** Content above preview in left column (e.g. IdentityCanvasGhost). */
  previewPrefix?: ReactNode;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  panelScrolls?: boolean;
  className?: string;
};

function readStoredSplit(): number {
  if (typeof window === "undefined") return DEFAULT_SPLIT;
  const raw = window.localStorage.getItem(STUDIO_SPLIT_STORAGE_KEY);
  const parsed = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 25 && parsed <= 75) {
    return parsed;
  }
  return DEFAULT_SPLIT;
}

export function ResumeStudioWorkbench({
  preview,
  panel,
  previewOverlay,
  previewPrefix,
  variant = "dashboard",
  monoClass,
  className,
  panelScrolls = true,
}: ResumeStudioWorkbenchProps) {
  const [mobileTab, setMobileTab] = useState<"preview" | "edit">("edit");
  const [defaultSplit, setDefaultSplit] = useState(DEFAULT_SPLIT);
  const isOnboarding = variant === "onboarding";

  useEffect(() => {
    setDefaultSplit(readStoredSplit());
  }, []);

  const handleLayout = (sizes: number[]) => {
    if (sizes[0] && typeof window !== "undefined") {
      window.localStorage.setItem(STUDIO_SPLIT_STORAGE_KEY, String(sizes[0]));
    }
  };

  const previewPane = (
    <ResumePaginatedPreview variant={variant} monoClass={monoClass}>
      {previewPrefix}
      {preview}
    </ResumePaginatedPreview>
  );

  const panelPane = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        panelScrolls && "overflow-y-auto overscroll-contain px-6 py-6",
        isOnboarding && !panelScrolls ? "bg-surface" : "bg-surface",
      )}
    >
      {panel}
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {/* Desktop: resizable split — preview fits (P2), panel scrolls */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={handleLayout}
          className="min-h-0 flex-1"
        >
          <ResizablePanel
            defaultSize={defaultSplit}
            minSize={25}
            maxSize={75}
            className="relative min-h-0"
          >
            <div className="relative h-full min-h-0">
              {previewPane}
              {previewOverlay}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className={isOnboarding ? "bg-white/10" : undefined} />
          <ResizablePanel
            defaultSize={100 - defaultSplit}
            minSize={25}
            maxSize={75}
            className="min-h-0"
          >
            {panelPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: M1 tabs */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div
          className={cn(
            "flex shrink-0 border-b",
            isOnboarding ? "border-white/10 bg-[oklch(0.14_0.04_268)]" : "border-border bg-surface",
          )}
          role="tablist"
          aria-label="Studio view"
        >
          {(["preview", "edit"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium capitalize transition-colors",
                mobileTab === tab
                  ? "border-b-2 border-mint text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {tab === "preview" ? "Preview" : "Edit"}
            </button>
          ))}
        </div>
        <div className="relative min-h-0 flex-1">
          {mobileTab === "preview" ? (
            <div className="relative h-full min-h-0">
              {previewPane}
              {previewOverlay}
            </div>
          ) : (
            panelPane
          )}
        </div>
      </div>
    </div>
  );
}
