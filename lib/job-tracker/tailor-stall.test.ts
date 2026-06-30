import { describe, expect, it } from "vitest";
import { isTailorStalled, TAILOR_STALL_MS } from "@/lib/job-tracker/tailor-stall";

describe("isTailorStalled", () => {
  const savedAt = "2026-06-30T02:54:49.805Z";

  it("returns false while CAPTURED is still within the stall window", () => {
    expect(
      isTailorStalled({
        status: "CAPTURED",
        hasTailoredResume: false,
        savedAt,
        nowMs: Date.parse(savedAt) + TAILOR_STALL_MS - 1,
      }),
    ).toBe(false);
  });

  it("returns true when CAPTURED exceeds the stall window without tailor", () => {
    expect(
      isTailorStalled({
        status: "CAPTURED",
        hasTailoredResume: false,
        savedAt,
        nowMs: Date.parse(savedAt) + TAILOR_STALL_MS,
      }),
    ).toBe(true);
  });

  it("returns true when pipeline issue message is present", () => {
    expect(
      isTailorStalled({
        status: "CAPTURED",
        hasTailoredResume: false,
        savedAt,
        issueMessage: "Tailor failed",
        nowMs: Date.parse(savedAt),
      }),
    ).toBe(true);
  });

  it("returns false when tailor exists or status advanced", () => {
    expect(
      isTailorStalled({
        status: "READY_TO_APPLY",
        hasTailoredResume: true,
        savedAt,
        nowMs: Date.parse(savedAt) + TAILOR_STALL_MS * 2,
      }),
    ).toBe(false);
  });
});
