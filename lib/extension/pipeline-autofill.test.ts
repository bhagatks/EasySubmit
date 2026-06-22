import { describe, expect, it, vi, beforeEach } from "vitest";
import { completePipelineAutofill } from "@/lib/extension/pipeline-autofill";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/extension/apply-pipeline", () => ({
  advancePipelineAfterAutofill: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-metadata", () => ({
  mergeJobEntryMetadata: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { advancePipelineAfterAutofill } from "@/lib/extension/apply-pipeline";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";

describe("completePipelineAutofill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advances RESUME_READY jobs to READY_TO_APPLY", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "RESUME_READY",
    } as never);

    const result = await completePipelineAutofill("user-1", "entry-1", {
      stub: true,
      note: "Prepared apply form",
    });

    expect(advancePipelineAfterAutofill).toHaveBeenCalledWith("user-1", "entry-1");
    expect(mergeJobEntryMetadata).toHaveBeenCalledWith(
      "user-1",
      "entry-1",
      expect.objectContaining({
        pipelinePhases: ["capture", "tailor", "autofill"],
        autofillStub: true,
      }),
    );
    expect(result).toEqual({ success: true, id: "entry-1", status: "READY_TO_APPLY" });
  });

  it("returns success when job is already READY_TO_APPLY", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "READY_TO_APPLY",
    } as never);

    const result = await completePipelineAutofill("user-1", "entry-2");

    expect(advancePipelineAfterAutofill).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, id: "entry-2", status: "READY_TO_APPLY" });
  });

  it("rejects CAPTURED jobs", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "CAPTURED",
    } as never);

    const result = await completePipelineAutofill("user-1", "entry-3");

    expect(result).toMatchObject({
      success: false,
      code: "invalid_state",
    });
  });
});
