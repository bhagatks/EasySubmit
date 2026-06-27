"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  computeFitScale,
  pageCountForContent,
  pageDimensionsPx,
  type PageSizeId,
} from "@/lib/resume/page-sizes";
import type { ResumeFontId } from "@/lib/resume/resume-fonts";
import {
  DEFAULT_STUDIO_ZOOM,
  clampStudioZoom,
  hasStoredStudioZoom,
} from "@/lib/resume/studio-preview-zoom";
import { ResumePreviewFontProvider } from "@/components/resume/resume-preview-font-context";
import { cn } from "@/lib/utils";

const PAGE_GAP_PX = 14;
const PAPER = "oklch(0.98 0.01 268)";

type ResumePaginatedPreviewProps = {
  children: ReactNode;
  pageWidthPx?: number;
  fontId: ResumeFontId;
  pageSizeId: PageSizeId;
  zoom?: number;
  monoClass?: string;
  canvasClassName?: string;
  variant?: "onboarding" | "dashboard";
  layoutKey?: string | number;
  autoFitZoom?: boolean;
  onAutoFitZoom?: (zoom: number) => void;
  onPageCountChange?: (pageCount: number) => void;
};

export function ResumePaginatedPreview({
  children,
  pageWidthPx = 480,
  fontId,
  pageSizeId,
  zoom = DEFAULT_STUDIO_ZOOM,
  monoClass,
  canvasClassName,
  variant = "dashboard",
  layoutKey,
  autoFitZoom = false,
  onAutoFitZoom,
  onPageCountChange,
}: ResumePaginatedPreviewProps) {
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(400);
  const autoFitAppliedRef = useRef(false);

  const { widthPx, heightPx: pageHeightPx } = pageDimensionsPx(pageSizeId, pageWidthPx);
  const pageCount = pageCountForContent(contentHeight, pageHeightPx);
  const stackHeight =
    pageCount * pageHeightPx + Math.max(0, pageCount - 1) * PAGE_GAP_PX;
  const scaledWidth = widthPx * zoom;
  const scaledHeight = stackHeight * zoom;

  const measureContent = useCallback(() => {
    const node = contentMeasureRef.current;
    if (!node) return;
    setContentHeight(Math.max(node.offsetHeight, 1));
  }, []);

  useLayoutEffect(() => {
    measureContent();
  }, [measureContent, children, pageSizeId, pageWidthPx, fontId]);

  useLayoutEffect(() => {
    measureContent();
    const id = requestAnimationFrame(() => measureContent());
    return () => cancelAnimationFrame(id);
  }, [layoutKey, measureContent]);

  useEffect(() => {
    const node = contentMeasureRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measureContent());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureContent]);

  useEffect(() => {
    onPageCountChange?.(pageCount);
  }, [onPageCountChange, pageCount]);

  useLayoutEffect(() => {
    if (!autoFitZoom || !onAutoFitZoom || autoFitAppliedRef.current) return;
    if (hasStoredStudioZoom()) return;

    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth <= 0 || viewport.clientHeight <= 0) return;

    const fit = computeFitScale(
      widthPx,
      stackHeight,
      viewport.clientWidth,
      viewport.clientHeight,
      32,
    );
    if (fit < DEFAULT_STUDIO_ZOOM) {
      autoFitAppliedRef.current = true;
      onAutoFitZoom(clampStudioZoom(fit));
    }
  }, [
    autoFitZoom,
    onAutoFitZoom,
    widthPx,
    stackHeight,
    pageCount,
    pageSizeId,
    layoutKey,
  ]);

  const isOnboarding = variant === "onboarding";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ResumePreviewFontProvider fontId={fontId}>
        <div
          ref={viewportRef}
          className={cn(
            "relative h-full min-h-0 flex-1 overflow-auto overscroll-contain",
            isOnboarding ? "bg-[oklch(0.16_0.04_268)]" : "bg-muted/20",
            canvasClassName,
          )}
        >
          <div
            className="mx-auto py-4"
            style={{ width: scaledWidth, minHeight: scaledHeight }}
          >
            <div
              className="relative origin-top-left"
              style={{
                transform: `scale(${zoom})`,
                width: widthPx,
              }}
            >
              {Array.from({ length: pageCount }).map((_, pageIndex) => (
                <div key={pageIndex}>
                  <div
                    className="relative overflow-hidden rounded-[2px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                    style={{
                      width: widthPx,
                      height: pageHeightPx,
                      backgroundColor: PAPER,
                    }}
                    aria-label={`Resume page ${pageIndex + 1} of ${pageCount}`}
                  >
                    <div
                      ref={pageIndex === 0 ? contentMeasureRef : undefined}
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(-${pageIndex * pageHeightPx}px)` }}
                    >
                      {children}
                    </div>
                  </div>

                  {pageIndex < pageCount - 1 ? (
                    <div
                      className="relative"
                      style={{ width: widthPx, height: PAGE_GAP_PX }}
                      aria-hidden
                    >
                      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/50" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ResumePreviewFontProvider>
    </div>
  );
}
