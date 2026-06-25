import { describe, expect, it } from "vitest";
import { canApplyCapture, applyCaptureBlockReason } from "@/src/shared/extension/apply-gate";

describe("canApplyCapture", () => {
  it("requires url and description >= 120 chars", () => {
    expect(canApplyCapture({ url: "https://jobs.example.com/1", description: "x".repeat(120) })).toBe(
      true,
    );
    expect(canApplyCapture({ url: "", description: "x".repeat(120) })).toBe(false);
    expect(canApplyCapture({ url: "https://jobs.example.com/1", description: "short" })).toBe(false);
  });

  it("returns helpful block reason", () => {
    expect(applyCaptureBlockReason({ url: "", description: "" })).toMatch(/job URL/i);
  });
});
