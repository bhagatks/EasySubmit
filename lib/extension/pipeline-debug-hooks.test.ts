import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/extension/pipeline-debug-progress", () => ({
  setPipelineDebugStep: vi.fn(async () => undefined),
  advancePipelineDebugStep: vi.fn(async () => undefined),
}));

vi.mock("@/src/shared/extension/pipeline-debug-gate", () => ({
  isPipelineDebugEnabled: vi.fn(() => true),
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
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

describe("pipeline debug hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(true);
  });

  it("builds context only when ids are present", () => {
    expect(pipelineDebugContext("user-1", "job-1")).toEqual({
      userId: "user-1",
      entryId: "job-1",
    });
    expect(pipelineDebugContext(undefined, "job-1")).toBeNull();
  });

  it("no-ops when debug is disabled", () => {
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(false);
    pipelineDebugStep({ userId: "user-1", entryId: "job-1" }, "capture_validate", {
      status: "done",
    });
    expect(setPipelineDebugStep).not.toHaveBeenCalled();
  });

  it("no-ops when context is missing", () => {
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(true);
    pipelineDebugStep(null, "capture_validate", { status: "done" });
    pipelineDebugAdvance(null, "capture_save");
    expect(setPipelineDebugStep).not.toHaveBeenCalled();
    expect(advancePipelineDebugStep).not.toHaveBeenCalled();
  });

  it("forwards updates when enabled", () => {
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(true);
    const ctx = { userId: "user-1", entryId: "job-1" };

    pipelineDebugStep(ctx, "capture_validate", { status: "done" });
    pipelineDebugAdvance(ctx, "capture_save", "capture_validate");

    expect(setPipelineDebugStep).toHaveBeenCalled();
    expect(advancePipelineDebugStep).toHaveBeenCalled();
  });
});
