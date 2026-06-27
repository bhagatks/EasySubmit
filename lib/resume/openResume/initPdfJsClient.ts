"use client";

/**
 * Browser-only pdfjs setup — matches xitanggg/open-resume read-pdf.ts.
 * Must run before getDocument(); safe to call multiple times.
 *
 * Static imports (not dynamic) so webpack bundles pdf.js + worker entry
 * with a valid public path — dynamic import() was resolving to /_next/undefined.
 */
import * as pdfjs from "pdfjs-dist/build/pdf.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — pdf.worker.entry has no TypeScript declarations
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

let initialized = false;

export function initPdfJsClient(): Promise<typeof pdfjs> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Open-Resume PDF parsing must run in the browser"),
    );
  }

  if (!initialized) {
    const workerSrc =
      typeof pdfjsWorker === "string" && pdfjsWorker.length > 0
        ? pdfjsWorker
        : "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    initialized = true;
  }

  return Promise.resolve(pdfjs);
}
