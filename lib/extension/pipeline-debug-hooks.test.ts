import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/extension/pipeline-debug-progress", () => ({
  setPipelineDebugStep: vi.fn(async () => undefined),
  advancePipelineDebugStep: vi.fn(async () => undefined),
}));

import {
  pipelineDebugAdvance,
  pipelineDebugContext,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";
import {
  advancePipelineDebugStep,
  setPipelineDebugStep,
} from "@/lib/extension/pipeline-debug-progress";

describe("pipeline debug hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds context only when ids are present", () => {
    expect(pipelineDebugContext("user-1", "job-1")).toEqual({
      userId: "user-1",
      entryId: "job-1",
    });
    expect(pipelineDebugContext(undefined, "job-1")).toBeNull();
  });

  it("forwards updates even when overlay gate would be off (progress store gates internally)", () => {
    const ctx = { userId: "user-1", entryId: "job-1" };

    pipelineDebugStep(ctx, "capture_validate", { status: "done" });
    pipelineDebugAdvance(ctx, "capture_save", "capture_validate");

    expect(setPipelineDebugStep).toHaveBeenCalled();
    expect(advancePipelineDebugStep).toHaveBeenCalled();
  });

  it("no-ops when context is missing", () => {
    pipelineDebugStep(null, "capture_validate", { status: "done" });
    pipelineDebugAdvance(null, "capture_save");
    expect(setPipelineDebugStep).not.toHaveBeenCalled();
    expect(advancePipelineDebugStep).not.toHaveBeenCalled();
  });
});
