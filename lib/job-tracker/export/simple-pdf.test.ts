import { describe, expect, it } from "vitest";
import { buildTextPdf, buildTextPdfFromString } from "@/lib/job-tracker/export/simple-pdf";

function decodePdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 8));
}

describe("buildTextPdf", () => {
  it("produces a valid PDF header and EOF marker", () => {
    const bytes = buildTextPdf(["Hello", "World"], "Test Doc");
    expect(decodePdfHeader(bytes)).toBe("%PDF-1.4");
    const tail = new TextDecoder().decode(bytes.slice(-6));
    expect(tail).toContain("%%EOF");
  });

  it("escapes parentheses in text content", () => {
    const bytes = buildTextPdf(["Line with (parens) and \\ backslash"]);
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf).toContain("\\(parens\\)");
    expect(pdf).toContain("\\\\");
  });

  it("wraps long lines without throwing", () => {
    const long = "word ".repeat(40).trim();
    const bytes = buildTextPdfFromString(`${long}\nSecond line`, "Wrapped");
    expect(bytes.length).toBeGreaterThan(200);
    expect(decodePdfHeader(bytes)).toBe("%PDF-1.4");
  });

  it("handles empty lines in multi-line input", () => {
    const bytes = buildTextPdfFromString("First\n\nThird");
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf).toContain("First");
    expect(pdf).toContain("Third");
  });
});
