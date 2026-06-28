// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  buildPdfFile,
  injectFileIntoInput,
  isCoverLetterUploadLabel,
  isResumeUploadLabel,
  resolveUploadDocumentKind,
} from "@/src/shared/extension/file-inject";

describe("file-inject", () => {
  it("detects resume and cover letter upload labels", () => {
    expect(isResumeUploadLabel("Upload your resume")).toBe(true);
    expect(isResumeUploadLabel("Cover letter (optional)")).toBe(false);
    expect(isCoverLetterUploadLabel("Motivation letter")).toBe(true);
    expect(resolveUploadDocumentKind("Resume/CV")).toBe("resume");
    expect(resolveUploadDocumentKind("Cover letter")).toBe("cover_letter");
  });

  it("builds a PDF file object", () => {
    const file = buildPdfFile(new Uint8Array([37, 80, 68, 70]), "resume.pdf");
    expect(file.type).toBe("application/pdf");
    expect(file.name).toBe("resume.pdf");
  });

  it("assigns injected files when the input accepts programmatic assignment", async () => {
    class MockDataTransfer {
      private fileList: File[] = [];
      items = {
        add: (file: File) => {
          this.fileList = [file];
        },
      };
      get files(): FileList {
        return {
          length: this.fileList.length,
          item: (index: number) => this.fileList[index] ?? null,
          0: this.fileList[0],
        } as unknown as FileList;
      }
    }

    vi.stubGlobal("DataTransfer", MockDataTransfer);

    const input = document.createElement("input");
    input.type = "file";
    Object.defineProperty(input, "files", {
      configurable: true,
      writable: true,
      value: null,
    });
    document.body.appendChild(input);

    const bytes = new Uint8Array([37, 80, 68, 70]).buffer;
    expect(await injectFileIntoInput(input, bytes, "resume.pdf")).toBe(true);
    expect(input.files?.[0]?.name).toBe("resume.pdf");
  });
});
