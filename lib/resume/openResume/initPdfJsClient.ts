/**
 * Browser-only pdfjs setup — matches xitanggg/open-resume read-pdf.ts.
 * Must run before getDocument(); safe to call multiple times.
 */
let initPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function initPdfJsClient(): Promise<typeof import("pdfjs-dist")> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Open-Resume PDF parsing must run in the browser"),
    );
  }

  if (!initPromise) {
    initPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Webpack bundles the worker entry (see next.config.mjs canvas alias).
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error — pdf.worker.entry has no TypeScript declarations
      const worker = await import("pdfjs-dist/build/pdf.worker.entry");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }

  return initPromise;
}
