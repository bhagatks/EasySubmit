"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_PREVIEW_HEIGHT = 480;

function measureIframeDocumentHeight(doc: Document | null | undefined): number | null {
  if (!doc) return null;

  const root = doc.documentElement;
  const body = doc.body;
  const height = Math.max(
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
  );

  if (height <= 0) return null;
  return Math.max(height, MIN_PREVIEW_HEIGHT);
}

type ReviewDocumentPreviewProps = {
  previewHtml: string;
  zoom?: number;
  className?: string;
  /** Accessible title for the preview iframe. */
  title?: string;
};

export function ReviewDocumentPreview({
  previewHtml,
  zoom = 1,
  className,
  title = "Document preview",
}: ReviewDocumentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState(960);

  const syncHeight = useCallback(() => {
    const height = measureIframeDocumentHeight(iframeRef.current?.contentDocument);
    if (height != null) setContentHeight(height);
  }, []);

  const scheduleSyncHeight = useCallback(() => {
    requestAnimationFrame(() => syncHeight());
  }, [syncHeight]);

  useEffect(() => {
    setContentHeight(960);
  }, [previewHtml]);

  useEffect(() => {
    syncHeight();
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    const root = doc.documentElement;
    if (root) observer.observe(root);
    if (doc.body) observer.observe(doc.body);

    return () => observer.disconnect();
  }, [previewHtml, syncHeight]);

  const scaledHeight = Math.ceil(contentHeight * zoom);
  const innerWidth = zoom < 1 ? `${100 / zoom}%` : "100%";

  return (
    <div className={cn("h-full min-h-0 w-full overflow-auto bg-white", className)}>
      <div className="mx-auto" style={{ width: "100%", height: scaledHeight }}>
        <div
          className="origin-top transition-transform duration-150"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: innerWidth,
            height: contentHeight,
            marginInline: "auto",
          }}
        >
          <iframe
            ref={iframeRef}
            title={title}
            srcDoc={previewHtml}
            onLoad={scheduleSyncHeight}
            scrolling="no"
            className="block w-full border-0 bg-white"
            style={{ height: contentHeight }}
          />
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use ReviewDocumentPreview */
export const ReviewResumePreview = ReviewDocumentPreview;
