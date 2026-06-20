"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useResumeFontState } from "@/components/resume/FontSelect";
import { usePageSizeState } from "@/components/resume/PageSizeSelect";
import { PreviewZoomOverlay } from "@/components/resume/PreviewZoomOverlay";
import { ResumePaginatedPreview } from "@/components/resume/ResumePaginatedPreview";
import { StudioLayoutPanel } from "@/components/resume/StudioLayoutPanel";
import { StudioPanelTabs, type StudioPanelTab } from "@/components/resume/StudioPanelTabs";
import { useStudioPreviewZoom } from "@/lib/resume/useStudioPreviewZoom";
import {
  DEFAULT_SPLIT,
  STUDIO_PANEL_AUTO_SAVE_ID,
  sanitizeStudioPanelStorage,
} from "@/lib/resume/studio-panel-storage";
import { cn } from "@/lib/utils";

export { STUDIO_PANEL_AUTO_SAVE_ID as STUDIO_SPLIT_STORAGE_KEY } from "@/lib/resume/studio-panel-storage";

const DESKTOP_MEDIA = "(min-width: 1024px)";

type ResumeStudioWorkbenchProps = {
  preview: ReactNode;
  panel: ReactNode;
  previewOverlay?: ReactNode;
  previewPrefix?: ReactNode;
  variant?: "onboarding" | "dashboard";
  /** Editor | Layout tabs on the right panel (dashboard profile edit only). */
  studioTabs?: boolean;
  monoClass?: string;
  panelScrolls?: boolean;
  className?: string;
  previewLayoutKey?: string | number;
  focusPreviewOnLayoutKey?: string | number;
};

function subscribeMediaQuery(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMediaQuerySnapshot(query: string) {
  return window.matchMedia(query).matches;
}

function getMediaQueryServerSnapshot() {
  return true;
}

function useDesktopLayout() {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(DESKTOP_MEDIA, callback),
    () => getMediaQuerySnapshot(DESKTOP_MEDIA),
    getMediaQueryServerSnapshot,
  );
}

export function ResumeStudioWorkbench({
  preview,
  panel,
  previewOverlay,
  previewPrefix,
  variant = "dashboard",
  studioTabs = false,
  monoClass,
  className,
  panelScrolls = true,
  previewLayoutKey,
  focusPreviewOnLayoutKey,
}: ResumeStudioWorkbenchProps) {
  const isDesktop = useDesktopLayout();
  const [mobileTab, setMobileTab] = useState<"preview" | "edit">("edit");
  const [studioPanelTab, setStudioPanelTab] = useState<StudioPanelTab>("editor");
  const [pageSizeId, setPageSizeId] = usePageSizeState();
  const [fontId, setFontId] = useResumeFontState();
  const [zoom, setZoom] = useStudioPreviewZoom();
  const isOnboarding = variant === "onboarding";

  useEffect(() => {
    sanitizeStudioPanelStorage();
  }, []);

  useEffect(() => {
    if (focusPreviewOnLayoutKey === undefined || isDesktop) return;
    setMobileTab("preview");
  }, [focusPreviewOnLayoutKey, isDesktop]);

  const handleAutoFitZoom = useCallback(
    (fitZoom: number) => {
      setZoom(fitZoom);
    },
    [setZoom],
  );

  const previewPane = (
    <ResumePaginatedPreview
      variant={variant}
      monoClass={monoClass}
      fontId={fontId}
      pageSizeId={pageSizeId}
      zoom={zoom}
      layoutKey={previewLayoutKey}
      autoFitZoom
      onAutoFitZoom={handleAutoFitZoom}
    >
      {previewPrefix}
      {preview}
    </ResumePaginatedPreview>
  );

  const previewSurface = (
    <div className="relative flex h-full min-h-0 w-full min-w-[240px] flex-col">
      {previewPane}
      <PreviewZoomOverlay zoom={zoom} onChange={setZoom} variant={variant} />
      {previewOverlay}
    </div>
  );

  const layoutPanel = (
    <StudioLayoutPanel
      fontId={fontId}
      pageSizeId={pageSizeId}
      onFontChange={setFontId}
      onPageSizeChange={setPageSizeId}
      variant={variant}
      monoClass={monoClass}
    />
  );

  const editorPanelBody = <div className="px-6 py-4">{panel}</div>;

  const editorContent = panelScrolls ? (
    editorPanelBody
  ) : (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{panel}</div>
  );

  const studioTabbedPanel = (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <StudioPanelTabs
        activeTab={studioPanelTab}
        onTabChange={setStudioPanelTab}
        variant={variant}
        monoClass={monoClass}
      />
      <div
        className={cn(
          "min-h-0 flex-1",
          panelScrolls
            ? "overflow-y-auto overscroll-contain"
            : "flex flex-col overflow-hidden",
        )}
      >
        {studioPanelTab === "editor" ? editorContent : (
          <div className="px-6 py-4">{layoutPanel}</div>
        )}
      </div>
    </div>
  );

  const panelPane = studioTabs ? (
    studioTabbedPanel
  ) : panelScrolls ? (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-surface">
      {editorPanelBody}
    </div>
  ) : (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">{panel}</div>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {isDesktop ? (
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId={STUDIO_PANEL_AUTO_SAVE_ID}
          className="h-full min-h-0 flex-1"
        >
          <ResizablePanel
            defaultSize={DEFAULT_SPLIT}
            minSize={30}
            maxSize={70}
            className="flex h-full min-h-0 flex-col overflow-hidden"
          >
            {previewSurface}
          </ResizablePanel>
          <ResizableHandle withHandle className={isOnboarding ? "bg-white/10" : undefined} />
          <ResizablePanel
            defaultSize={100 - DEFAULT_SPLIT}
            minSize={30}
            maxSize={70}
            className="flex h-full min-h-0 flex-col overflow-hidden"
          >
            {panelPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
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
            {mobileTab === "preview" ? previewSurface : panelPane}
          </div>
        </div>
      )}
    </div>
  );
}
