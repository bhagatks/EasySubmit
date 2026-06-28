import { describe, expect, it, vi } from "vitest";
import {
  clipPromptForLiteFallback,
  GEMINI_503_BACKOFF_MAX_MS,
  GEMINI_503_BACKOFF_MIN_MS,
  isGeminiHighDemandError,
  jitteredBackoffMs,
} from "@/src/lib/ai/engine/gemini-resilience";

describe("gemini-resilience", () => {
  it("detects 503 high demand errors", () => {
    expect(
      isGeminiHighDemandError(
        new Error(
          "Failed after 3 attempts. Last error: This model is currently experiencing high demand.",
        ),
      ),
    ).toBe(true);
    expect(isGeminiHighDemandError({ status: 503 })).toBe(true);
    expect(isGeminiHighDemandError(new Error("invalid api key"))).toBe(false);
  });

  it("computes jittered backoff within bounds", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(jitteredBackoffMs(0)).toBe(GEMINI_503_BACKOFF_MIN_MS);
    expect(jitteredBackoffMs(5)).toBe(GEMINI_503_BACKOFF_MAX_MS);
    vi.restoreAllMocks();
  });

  it("clips oversized prompts for lite fallback", () => {
    const system = "s".repeat(5000);
    const prompt = "p".repeat(20_000);
    const clipped = clipPromptForLiteFallback(system, prompt, 12_000);
    expect(clipped.clipped).toBe(true);
    expect(clipped.system.length + clipped.prompt.length).toBeLessThanOrEqual(12_000);
  });
});
