import { describe, expect, it } from "vitest";
import {
  enhanceFeedbackTierLabel,
  resolveEnhanceFeedbackTier,
} from "@/lib/job-tracker/enhance/enhance-feedback-tier";

describe("resolveEnhanceFeedbackTier", () => {
  it("flags role mismatch for cross-domain deterministic enhance", () => {
    expect(
      resolveEnhanceFeedbackTier({
        engineMode: "deterministic",
        isCrossDomain: true,
      }),
    ).toBe("role_mismatch");
  });

  it("uses formatting tier for deterministic same-domain enhance", () => {
    expect(
      resolveEnhanceFeedbackTier({
        engineMode: "deterministic",
        isCrossDomain: false,
      }),
    ).toBe("formatting");
  });

  it("uses success tier for AI enhance without warnings", () => {
    expect(
      resolveEnhanceFeedbackTier({
        engineMode: "ai",
        isCrossDomain: false,
      }),
    ).toBe("success");
    expect(enhanceFeedbackTierLabel("success")).toBe("Resume enhanced");
  });
});
