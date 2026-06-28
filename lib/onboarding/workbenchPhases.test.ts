import { describe, expect, it } from "vitest";
import {
  WORKBENCH_FINALIZE_LABEL,
  WORKBENCH_PHASE_COUNT,
  WORKBENCH_PHASES,
  advancingToNextPhaseLabel,
  continueToNextPhaseLabel,
  getWorkbenchPhase,
  nextWorkbenchPhaseLabel,
  proceedToNextPhaseLabel,
  workbenchPhaseHeader,
} from "@/lib/onboarding/workbenchPhases";

describe("workbenchPhases", () => {
  it("defines three onboarding phases", () => {
    expect(WORKBENCH_PHASE_COUNT).toBe(3);
    expect(WORKBENCH_PHASES.map((p) => p.code)).toEqual(["IDENTITY", "IMPORT", "STUDIO"]);
  });

  it("getWorkbenchPhase returns phase metadata", () => {
    expect(getWorkbenchPhase(1)?.label).toBe("Identity");
    expect(getWorkbenchPhase(99)).toBeUndefined();
  });

  it("builds navigation labels", () => {
    expect(workbenchPhaseHeader(2)).toBe("Phase 2 · Import");
    expect(nextWorkbenchPhaseLabel(1)).toBe("Import");
    expect(proceedToNextPhaseLabel(2)).toBe("Proceed to Studio");
    expect(continueToNextPhaseLabel(3)).toBe("Continue");
    expect(advancingToNextPhaseLabel(3)).toBe("Advancing…");
    expect(WORKBENCH_FINALIZE_LABEL).toBe("Finalize & continue");
  });
});
