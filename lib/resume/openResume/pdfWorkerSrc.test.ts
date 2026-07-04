import { describe, expect, it } from "vitest";
import {
  PDF_WORKER_PUBLIC_PATH,
  resolvePdfWorkerPublicUrl,
} from "@/lib/resume/openResume/pdfWorkerSrc";

describe("resolvePdfWorkerPublicUrl", () => {
  it("builds an absolute worker URL from the app origin", () => {
    expect(resolvePdfWorkerPublicUrl("http://localhost:3000")).toBe(
      `http://localhost:3000${PDF_WORKER_PUBLIC_PATH}`,
    );
  });

  it("uses the public worker path", () => {
    expect(PDF_WORKER_PUBLIC_PATH).toBe("/pdf.worker.min.mjs");
  });
});
