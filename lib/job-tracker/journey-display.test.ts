import { describe, expect, it } from "vitest";
import { resolveJourneyDisplay } from "@/src/shared/journey-display";

describe("resolveJourneyDisplay", () => {
  it("returns Stage 0 Apply when status is null", () => {
    const display = resolveJourneyDisplay(null, false);
    expect(display).toEqual({
      stage: 0,
      label: "Apply",
      applyButtonState: "hidden",
      showResumeCard: false,
      showAssistCard: false,
    });
  });

  it("returns preparing copy for CAPTURED", () => {
    const display = resolveJourneyDisplay("CAPTURED", false);
    expect(display.stage).toBe(1);
    expect(display.label).toBe("Optimizing resume…");
    expect(display.applyButtonState).toBe("disabled");
    expect(display.showResumeCard).toBe(false);
  });

  it("returns resume ready for RESUME_READY", () => {
    const display = resolveJourneyDisplay("RESUME_READY", false);
    expect(display.label).toBe("Resume ready");
    expect(display.showResumeCard).toBe(true);
    expect(display.showAssistCard).toBe(false);
  });

  it("returns apply assist for READY_TO_APPLY", () => {
    const display = resolveJourneyDisplay("READY_TO_APPLY", false);
    expect(display).toEqual({
      stage: 2,
      label: "Apply assist",
      applyButtonState: "navigate",
      showResumeCard: true,
      showAssistCard: true,
    });
  });

  it("returns applied for APPLIED", () => {
    const display = resolveJourneyDisplay("APPLIED", false);
    expect(display.stage).toBe(3);
    expect(display.label).toBe("Applied");
    expect(display.applyButtonState).toBe("completed");
  });

  it("surfaces pipeline errors", () => {
    const display = resolveJourneyDisplay("CAPTURED", true);
    expect(display).toEqual({
      stage: "error",
      label: "Something went wrong",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
    });
  });
});
