import { describe, expect, it } from "vitest";
import {
  degradedOutcomeFromEnhanceResult,
} from "@/lib/job-tracker/enhance/read-entry-degraded-outcome";

describe("degradedOutcomeFromEnhanceResult", () => {
  it("returns null when AI succeeded", () => {
    expect(
      degradedOutcomeFromEnhanceResult({
        aiAttempted: true,
        aiSucceeded: true,
        warning: "should not surface",
      }),
    ).toBeNull();
  });

  it("returns degraded fields when AI attempted but failed", () => {
    expect(
      degradedOutcomeFromEnhanceResult({
        aiAttempted: true,
        aiSucceeded: false,
        warning: "AI busy — rules saved.",
        action: "wait",
        actionHref: null,
        aiBlockCode: "rate_limited",
      }),
    ).toEqual({
      aiAttempted: true,
      aiSucceeded: false,
      warning: "AI busy — rules saved.",
      action: "wait",
      actionHref: null,
      aiBlockCode: "rate_limited",
    });
  });
});
