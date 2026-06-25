import { describe, expect, it, vi, beforeEach } from "vitest";
import { markJobTrackerApplied } from "@/lib/extension/mark-applied";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/extension/job-service", () => ({
  updateJobTrackerStatus: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-metadata", () => ({
  mergeJobEntryMetadata: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";

describe("markJobTrackerApplied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateJobTrackerStatus).mockResolvedValue({ count: 1 });
  });

  it("is idempotent when already applied", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "APPLIED",
    } as never);

    const result = await markJobTrackerApplied("user-1", "entry-1", "dashboard_manual");
    expect(result).toMatchObject({ success: true, alreadyApplied: true });
    expect(updateJobTrackerStatus).not.toHaveBeenCalled();
  });

  it("rejects mark applied before READY_TO_APPLY", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "CAPTURED",
    } as never);

    const result = await markJobTrackerApplied("user-1", "entry-1", "extension_auto");
    expect(result).toMatchObject({ success: false, code: "invalid_status" });
    expect(updateJobTrackerStatus).not.toHaveBeenCalled();
  });
});
