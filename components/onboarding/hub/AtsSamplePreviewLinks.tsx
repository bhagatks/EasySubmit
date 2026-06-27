"use client";

import { useState } from "react";
import { PrimeResume } from "@/components/onboarding/PrimeResume";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ATS_UNIVERSAL_SAMPLE_RESUME } from "@/lib/resume/ats-universal-sample";
import { cn } from "@/lib/utils";

type SampleFormat = "PDF" | "DOCX";

type AtsSamplePreviewLinksProps = {
  monoClass: string;
  linkClassName: string;
  linkColor: string;
};

export function AtsSamplePreviewLinks({
  monoClass,
  linkClassName,
  linkColor,
}: AtsSamplePreviewLinksProps) {
  const [open, setOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<SampleFormat>("PDF");

  const openPreview = (format: SampleFormat) => {
    setActiveFormat(format);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => openPreview("PDF")}
        className={cn(monoClass, linkClassName)}
        style={{ color: linkColor }}
      >
        Sample PDF
      </button>
      <button
        type="button"
        onClick={() => openPreview("DOCX")}
        className={cn(monoClass, linkClassName)}
        style={{ color: linkColor }}
      >
        Sample DOCX
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          layout="flex"
          className={cn(
            "max-h-[min(94vh,900px)] w-[min(94vw,680px)] gap-0 overflow-hidden",
            "border border-white/10 bg-[oklch(0.14_0.04_268)] p-0 text-[oklch(0.98_0.01_268)]",
          )}
        >
          <DialogHeader className="space-y-1 border-b border-white/10 px-4 py-3 text-left">
            <p
              className={cn(monoClass, "text-[10px] font-semibold uppercase tracking-[0.14em]")}
              style={{ color: "oklch(0.82 0.16 165)" }}
            >
              ATS universal template
            </p>
            <DialogTitle className="text-base font-semibold text-[oklch(0.98_0.01_268)]">
              Sample {activeFormat}
            </DialogTitle>
            <DialogDescription className="text-xs text-[oklch(0.65_0.02_268)]">
              PDF and Word use the same single-column layout — preview only, no download.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[oklch(0.12_0.03_268)] p-4">
            <div className="overflow-hidden rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <PrimeResume resume={ATS_UNIVERSAL_SAMPLE_RESUME} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
