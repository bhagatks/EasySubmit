import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/extension/pipeline-debug-gate", () => ({
  isPipelineDebugEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/extension/apply-pipeline-step-analytics", () => ({
  isApplyPipelineStepAnalyticsEnabled: vi.fn(async () => true),
}));

vi.mock("@/src/shared/analytics/server-pipeline-step-capture", () => ({
  captureApplyPipelineStarted: vi.fn(),
  captureApplyPipelineStep: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  advancePipelineDebugStep,
  getPipelineDebugProgress,
  initPipelineDebugProgress,
  setPipelineDebugStep,
} from "@/lib/extension/pipeline-debug-progress";
import {
  captureApplyPipelineStarted,
  captureApplyPipelineStep,
} from "@/src/shared/analytics/server-pipeline-step-capture";
import { isApplyPipelineStepAnalyticsEnabled } from "@/lib/extension/apply-pipeline-step-analytics";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";
import { PIPELINE_DEBUG_METADATA_KEY } from "@/src/shared/extension/pipeline-debug-types";

const userId = "user-1";
const entryId = "job-1";

describe("pipeline debug progress store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      metadata: {},
    } as never);
    vi.mocked(prisma.jobTrackerEntry.updateMany).mockResolvedValue({ count: 1 });
  });

  it("initializes progress and emits pipeline started analytics", async () => {
    await initPipelineDebugProgress(userId, entryId, "trace-1");

    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalled();
    expect(captureApplyPipelineStarted).toHaveBeenCalledWith({
      userId,
      entryId,
      traceId: "trace-1",
    });
  });

  it("skips init when progress already exists", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      metadata: {
        [PIPELINE_DEBUG_METADATA_KEY]: {
          traceId: "trace-existing",
          startedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          steps: [{ id: "capture_validate", label: "Validate", group: "Capture", status: "done" }],
        },
      },
    } as never);

    await initPipelineDebugProgress(userId, entryId, "trace-new");

    expect(captureApplyPipelineStarted).not.toHaveBeenCalled();
    expect(prisma.jobTrackerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("updates a step and emits step analytics", async () => {
    await setPipelineDebugStep(userId, entryId, "capture_validate", {
      status: "done",
      detail: "Validated",
      meta: { platform: "linkedin" },
    });

    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalled();
    expect(captureApplyPipelineStep).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        entryId,
        stepId: "capture_validate",
        status: "done",
      }),
    );
  });

  it("advances steps in one write", async () => {
    await advancePipelineDebugStep(
      userId,
      entryId,
      "capture_save",
      "capture_validate",
      { detail: "Validated" },
    );

    expect(captureApplyPipelineStep).toHaveBeenCalledTimes(2);
    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalledTimes(1);
  });

  it("reads stored progress from metadata", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      metadata: {
        [PIPELINE_DEBUG_METADATA_KEY]: {
          traceId: "trace-1",
          updatedAt: "2026-01-01T00:00:00.000Z",
          steps: [
            {
              id: "capture_validate",
              label: "Validate",
              group: "Capture",
              status: "done",
            },
          ],
        },
      },
    } as never);

    const progress = await getPipelineDebugProgress(userId, entryId);
    expect(progress?.traceId).toBe("trace-1");
    expect(progress?.steps[0]?.status).toBe("done");
  });

  it("no-ops when the job row is missing", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);

    await expect(getPipelineDebugProgress(userId, entryId)).resolves.toBeNull();
    await setPipelineDebugStep(userId, entryId, "capture_validate", { status: "done" });
    expect(prisma.jobTrackerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("activates a step without completing a prior step", async () => {
    await advancePipelineDebugStep(userId, entryId, "capture_save");

    expect(captureApplyPipelineStep).toHaveBeenCalledTimes(1);
    expect(captureApplyPipelineStep).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: "capture_save", status: "active" }),
    );
  });

  it("skips init when the job row is missing", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);

    await initPipelineDebugProgress(userId, entryId, "trace-1");

    expect(captureApplyPipelineStarted).not.toHaveBeenCalled();
    expect(prisma.jobTrackerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("replaces invalid metadata with pipeline debug progress", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      metadata: ["invalid"],
    } as never);

    await setPipelineDebugStep(userId, entryId, "capture_validate", {
      status: "done",
      meta: { platform: "workday" },
    });

    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: entryId, userId },
      }),
    );
  });

  it("emits analytics without writing overlay progress when overlay is off", async () => {
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(false);
    vi.mocked(isApplyPipelineStepAnalyticsEnabled).mockResolvedValue(true);

    await setPipelineDebugStep(userId, entryId, "capture_validate", {
      status: "done",
      detail: "Validated",
    });

    expect(prisma.jobTrackerEntry.updateMany).not.toHaveBeenCalled();
    expect(captureApplyPipelineStep).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        entryId,
        stepId: "capture_validate",
        status: "done",
      }),
    );
  });

  it("skips everything when both overlay and analytics are off", async () => {
    vi.mocked(isPipelineDebugEnabled).mockReturnValue(false);
    vi.mocked(isApplyPipelineStepAnalyticsEnabled).mockResolvedValue(false);

    await setPipelineDebugStep(userId, entryId, "capture_validate", { status: "done" });

    expect(prisma.jobTrackerEntry.updateMany).not.toHaveBeenCalled();
    expect(captureApplyPipelineStep).not.toHaveBeenCalled();
  });
});
