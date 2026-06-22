import { describe, expect, it } from "vitest";
import { renderStageNudgeMarkup } from "@/src/shared/extension/stage-nudge";

describe("renderStageNudgeMarkup", () => {
  it("renders capture nudge with tailor copy and pipeline", () => {
    const html = renderStageNudgeMarkup("capture");

    expect(html).toContain("Add this job to tailor your resume");
    expect(html).toContain("white-card");
    expect(html).toContain("Step 1 · Capture");
    expect(html).toContain("Tailor");
    expect(html).toContain("Tap to save");
  });

  it("renders captured success state for post-save phase teaser", () => {
    const html = renderStageNudgeMarkup("captured");

    expect(html).toContain("Step 1 complete");
    expect(html).toContain("Job captured");
    expect(html).toContain("next phase");
  });
});
