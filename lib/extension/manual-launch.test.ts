import { describe, expect, it } from "vitest";
import { resolveManualLaunchPresentation } from "@/src/shared/extension/manual-launch";

describe("resolveManualLaunchPresentation", () => {
  it("returns job when capture requirements are met", () => {
    expect(
      resolveManualLaunchPresentation({
        url: "https://boards.greenhouse.io/acme/jobs/123",
        description: "x".repeat(120),
        onJobPage: true,
      }),
    ).toBe("job");
  });

  it("returns loading on a job page without enough description", () => {
    expect(
      resolveManualLaunchPresentation({
        url: "https://www.linkedin.com/jobs/view/123",
        description: "short",
        onJobPage: true,
      }),
    ).toBe("loading");
  });

  it("returns loading when URL has a strong job signal", () => {
    expect(
      resolveManualLaunchPresentation({
        url: "https://boards.greenhouse.io/acme/jobs/123",
        description: null,
        onJobPage: false,
      }),
    ).toBe("loading");
  });

  it("returns manual capture on unrelated pages", () => {
    expect(
      resolveManualLaunchPresentation({
        url: "https://example.com/blog/hiring",
        description: null,
        onJobPage: false,
      }),
    ).toBe("manual_capture");
  });
});
