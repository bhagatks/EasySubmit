import { describe, expect, it } from "vitest";
import { resolveEnhanceTraceOutcome } from "@/lib/ai/enhance-trace-outcome";

describe("resolveEnhanceTraceOutcome", () => {
  it("marks full success when all calls succeed", () => {
    expect(
      resolveEnhanceTraceOutcome([
        { operation: "ai.enhance.generate_object", status: "success" },
        { operation: "ai.enhance.generate_text", status: "success" },
      ]),
    ).toBe("AI success");
  });

  it("marks partial success when JD fails but resume passes", () => {
    expect(
      resolveEnhanceTraceOutcome([
        {
          operation: "ai.enhance.generate_object",
          status: "error",
          errorCode: "insufficient_quota",
        },
        { operation: "ai.enhance.generate_text", status: "success" },
        { operation: "ai.enhance.generate_text", status: "success" },
      ]),
    ).toBe("AI success (partial — JD fallback)");
  });

  it("uses job meta aiSucceeded when resume logs are missing", () => {
    expect(
      resolveEnhanceTraceOutcome(
        [{ operation: "ai.enhance.generate_object", status: "error" }],
        { aiSucceeded: true, aiAttempted: true },
      ),
    ).toBe("AI success (partial — JD fallback)");
  });

  it("marks failed when no resume success and meta not succeeded", () => {
    expect(
      resolveEnhanceTraceOutcome([
        { operation: "ai.enhance.generate_text", status: "error", errorCode: "provider_error" },
      ]),
    ).toBe("AI failed");
  });
});
