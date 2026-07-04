import { describe, expect, it } from "vitest";
import {
  computeStepDurationMs,
  formatDurationMinSec,
  formatStepDurationLabel,
  pipelineStepLabelForApiOperation,
} from "@/src/shared/extension/pipeline-debug-duration";

describe("formatDurationMinSec", () => {
  it("formats minutes and seconds", () => {
    expect(formatDurationMinSec(290_857)).toBe("4m 51s");
    expect(formatDurationMinSec(17_740)).toBe("0m 18s");
    expect(formatDurationMinSec(500)).toBe("0m 1s");
    expect(formatDurationMinSec(0)).toBe("0m 0s");
  });
});

describe("computeStepDurationMs", () => {
  it("uses finishedAt when present", () => {
    const ms = computeStepDurationMs({
      startedAt: "2026-07-04T02:45:14.386Z",
      finishedAt: "2026-07-04T02:45:32.246Z",
    });
    expect(ms).toBe(17_860);
  });

  it("returns null without startedAt", () => {
    expect(computeStepDurationMs({ startedAt: undefined, finishedAt: "2026-07-04T02:45:32.246Z" })).toBeNull();
  });
});

describe("formatStepDurationLabel", () => {
  it("appends ellipsis for active steps", () => {
    const label = formatStepDurationLabel(
      {
        status: "active",
        startedAt: "2026-07-04T02:45:14.386Z",
        finishedAt: undefined,
      },
      Date.parse("2026-07-04T02:45:32.386Z"),
    );
    expect(label).toBe("0m 18s…");
  });
});

describe("pipelineStepLabelForApiOperation", () => {
  it("maps enhance operations to pipeline step ids", () => {
    expect(pipelineStepLabelForApiOperation("ai.enhance.generate_object")).toBe("ai_jd_extract");
    expect(pipelineStepLabelForApiOperation("ai.enhance.generate_text")).toBe("ai_pass1");
  });
});
