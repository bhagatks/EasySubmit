/** Static worker served from public/ — copied by scripts/copy-pdf-worker.mjs on install. */
export const PDF_WORKER_PUBLIC_PATH = "/pdf.worker.min.mjs";

export function resolvePdfWorkerPublicUrl(origin: string): string {
  return new URL(PDF_WORKER_PUBLIC_PATH, origin).href;
}
