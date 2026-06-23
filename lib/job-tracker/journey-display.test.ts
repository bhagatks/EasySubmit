import { describe, expect, it } from "vitest";
import { resolveJourneyDisplay } from "@/src/shared/journey-display";

describe("resolveJourneyDisplay", () => {
  it("returns Stage 0 Apply when nothing is saved", () => {
    const display = resolveJourneyDisplay({ saved: false });
    expect(display.stage).toBe(0);
    expect(display.extensionPrimaryLabel).toBe("Apply");
    expect(display.appLabel).toBe("");
  });

  it("returns preparing copy for CAPTURED", () => {
    const display = resolveJourneyDisplay({ saved: true, status: "CAPTURED" });
    expect(display.stage).toBe(1);
    expect(display.appLabel).toBe("Optimizing resume…");
    expect(display.applyEnabled).toBe(false);
  });

  it("returns apply assist for READY_TO_APPLY", () => {
    const display = resolveJourneyDisplay({ saved: true, status: "READY_TO_APPLY" });
    expect(display.stage).toBe(2);
    expect(display.appLabel).toBe("Apply assist");
    expect(display.applyEnabled).toBe(true);
  });

  it("returns Re-apply when canReapply is true", () => {
    const display = resolveJourneyDisplay({
      saved: true,
      status: "APPLIED",
      canReapply: true,
    });
    expect(display.extensionPrimaryLabel).toBe("Re-apply");
    expect(display.applyEnabled).toBe(true);
    expect(display.stage).toBe(0);
  });

  it("surfaces pipeline errors", () => {
    const display = resolveJourneyDisplay({
      saved: true,
      status: "CAPTURED",
      metadata: { pipelineError: "Daily enhancement limit reached" },
    });
    expect(display.stage).toBe("error");
    expect(display.hasError).toBe(true);
  });
});
