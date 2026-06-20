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
} from "@/lib/resume/page-sizes";
import { PageSizeSelect, usePageSizeState } from "@/components/resume/PageSizeSelect";
import { FontSelect, useResumeFontState } from "@/components/resume/FontSelect";
import { ResumePreviewFontProvider } from "@/components/resume/resume-preview-font-context";
import { cn } from "@/lib/utils";

const PAGE_GAP_PX = 14;
const PAPER = "oklch(0.98 0.01 268)";

type ResumePaginatedPreviewProps = {
  children: ReactNode;
  pageWidthPx?: number;
  monoClass?: string;
  toolbarClassName?: string;
  canvasClassName?: string;
  variant?: "onboarding" | "dashboard";
};

export function ResumePaginatedPreview({
  children,
  pageWidthPx = 480,
  monoClass,
  toolbarClassName,
  canvasClassName,
  variant = "dashboard",
}: ResumePaginatedPreviewProps) {
  const [pageSizeId, setPageSizeId] = usePageSizeState();
  const [fontId, setFontId] = useResumeFontState();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(400);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  const { widthPx, heightPx: pageHeightPx } = pageDimensionsPx(pageSizeId, pageWidthPx);
  const pageCount = pageCountForContent(contentHeight, pageHeightPx);
  const stackHeight =
    pageCount * pageHeightPx + Math.max(0, pageCount - 1) * PAGE_GAP_PX;

  const measureContent = useCallback(() => {
    const node = contentMeasureRef.current;
    if (!node) return;
    setContentHeight(Math.max(node.offsetHeight, 1));
  }, []);

  useLayoutEffect(() => {
    measureContent();
  }, [measureContent, children, pageSizeId, pageWidthPx, fontId]);

  useEffect(() => {
    const node = contentMeasureRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measureContent());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureContent]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const update = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewportSize.width <= 0 || stackHeight <= 0) return;
    setScale(
      computeFitScale(widthPx, stackHeight, viewportSize.width, viewportSize.height, 16),
    );
  }, [viewportSize, stackHeight, widthPx]);

  const isOnboarding = variant === "onboarding";
  const breakLabelBg = isOnboarding ? "oklch(0.16 0.04 268)" : "hsl(var(--muted))";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-4 border-b px-4 py-2",
          isOnboarding ? "border-white/10 bg-[oklch(0.14_0.04_268)]" : "border-border bg-surface/80",
          toolbarClassName,
        )}
      >
        <FontSelect value={fontId} onChange={setFontId} monoClass={monoClass} />
        <PageSizeSelect value={pageSizeId} onChange={setPageSizeId} monoClass={monoClass} />
      </div>

      <ResumePreviewFontProvider fontId={fontId}>
      <div
        ref={viewportRef}
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          isOnboarding ? "bg-[oklch(0.16_0.04_268)]" : "bg-muted/20",
          canvasClassName,
        )}
      >
        <div
          className="origin-top transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})`, width: widthPx }}
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
                  className="relative flex items-center justify-center"
                  style={{ width: widthPx, height: PAGE_GAP_PX }}
                  aria-hidden
                >
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[oklch(0.62_0.21_265_/_0.6)]" />
                  <span
                    className={cn(
                      monoClass,
                      "relative z-[1] px-2 text-[9px] font-medium uppercase tracking-[0.16em] text-[oklch(0.62_0.21_265)]",
                    )}
                    style={{ backgroundColor: breakLabelBg }}
                  >
                    Page break
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      </ResumePreviewFontProvider>
    </div>
  );
}
