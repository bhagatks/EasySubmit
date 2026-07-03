import { describe, expect, it } from "vitest";
import { resolveJourneyDisplay } from "@/src/shared/journey-display";
import { BRAND } from "@/src/shared/brand";

describe("resolveJourneyDisplay", () => {
  it("returns Stage 0 Apply when status is null", () => {
    const display = resolveJourneyDisplay(null, false);
    expect(display).toEqual({
      stage: 0,
      label: BRAND.applyCta,
      statusLabel: "",
      applyButtonState: "hidden",
      showResumeCard: false,
      showAssistCard: false,
      showReviewRow: false,
    });
  });

  it("returns empty status for CAPTURED — copy comes from user message resolver", () => {
    const display = resolveJourneyDisplay("CAPTURED", false);
    expect(display.stage).toBe(1);
    expect(display.label).toBe("");
    expect(display.statusLabel).toBe("");
    expect(display.applyButtonState).toBe("hidden");
    expect(display.showReviewRow).toBe(false);
  });

  it("returns auto suggest CTA for RESUME_READY", () => {
    const display = resolveJourneyDisplay("RESUME_READY", false);
    expect(display.stage).toBe(2);
    expect(display.label).toBe(BRAND.autoSuggestCta);
    expect(display.statusLabel).toBe("");
    expect(display.showReviewRow).toBe(true);
    expect(display.showAssistCard).toBe(false);
  });

  it("returns ready to apply for READY_TO_APPLY", () => {
    const display = resolveJourneyDisplay("READY_TO_APPLY", false);
    expect(display).toEqual({
      stage: 3,
      label: BRAND.autoSuggestCta,
      statusLabel: "",
      applyButtonState: "navigate",
      showResumeCard: true,
      showAssistCard: false,
      showReviewRow: true,
    });
  });

  it("returns applied for APPLIED", () => {
    const display = resolveJourneyDisplay("APPLIED", false);
    expect(display.stage).toBe(4);
    expect(display.label).toBe("Applied");
    expect(display.statusLabel).toBe("");
    expect(display.showReviewRow).toBe(true);
    expect(display.applyButtonState).toBe("completed");
  });

  it("surfaces pipeline errors without legacy copy", () => {
    const display = resolveJourneyDisplay("CAPTURED", true);
    expect(display).toEqual({
      stage: "error",
      label: "",
      statusLabel: "",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
      showReviewRow: false,
    });
  });
});
