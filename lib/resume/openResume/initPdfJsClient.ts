"use client";

/**
 * Browser-only pdfjs setup — matches xitanggg/open-resume read-pdf.ts.
 * Must run before getDocument(); safe to call multiple times.
 *
 * Worker is copied to public/pdf.worker.min.mjs (see scripts/copy-pdf-worker.mjs).
 * Webpack ?url imports for pdfjs-dist v6 do not resolve reliably in Next 14.
 */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolvePdfWorkerPublicUrl } from "@/lib/resume/openResume/pdfWorkerSrc";

let initialized = false;

export function initPdfJsClient(): Promise<typeof pdfjs> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Open-Resume PDF parsing must run in the browser"),
    );
  }

  if (!initialized) {
    pdfjs.GlobalWorkerOptions.workerSrc = resolvePdfWorkerPublicUrl(
      window.location.origin,
    );
    initialized = true;
  }

  return Promise.resolve(pdfjs);
}
