import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  findActiveJobTrackerEntryForUrl,
  getJobTrackerStatusForUrl,
  saveJobTrackerEntry,
} from "@/lib/extension/job-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/job-tracker/capture-log", () => ({
  attachCaptureDiagnosticsToMetadata: vi.fn((_input, meta) => ({ metadata: meta ?? {} })),
  logJobCaptureOnSave: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

const URL = "https://acme.myworkdayjobs.com/job/eng";
const LONG_JD = "Description\n\n" + "x".repeat(120);

describe("job-service active row lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns most recent non-archived row for getJobTrackerStatusForUrl", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      id: "entry-1",
      status: "READY_TO_APPLY",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: URL,
    } as never);

    const status = await getJobTrackerStatusForUrl("user-1", URL);

    expect(status).toEqual({
      saved: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
      title: "Engineer",
      canReapply: false,
    });
    expect(prisma.jobTrackerEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: { not: "ARCHIVED" },
          archivedAt: null,
        }),
        orderBy: { savedAt: "desc" },
      }),
    );
  });

  it("matches Workday posting URLs with and without source tracking param", async () => {
    const withSource =
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346?source=LinkedIn";
    const withoutSource =
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346";

    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      id: "entry-1",
      status: "READY_TO_APPLY",
      title: "Sr Manager",
      company: "iRhythm",
      canonicalUrl: withoutSource,
    } as never);

    const withTracking = await getJobTrackerStatusForUrl("user-1", withSource);
    const withoutTracking = await getJobTrackerStatusForUrl("user-1", withoutSource);

    expect(withTracking.saved).toBe(true);
    expect(withoutTracking.saved).toBe(true);
    expect(withTracking.id).toBe("entry-1");
  });

  it("returns saved:false after row deleted", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);
    const status = await getJobTrackerStatusForUrl(
      "user-1",
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Role_JR1346?source=LinkedIn",
    );
    expect(status).toEqual({ saved: false });
  });
});

describe("saveJobTrackerEntry re-apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates in-progress row instead of creating a duplicate", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValueOnce({
      id: "entry-progress",
      status: "CAPTURED",
      title: "Old",
      company: null,
      canonicalUrl: URL,
    } as never);

    vi.mocked(prisma.jobTrackerEntry.update).mockResolvedValue({
      id: "entry-progress",
      status: "CAPTURED",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: URL,
    } as never);

    const saved = await saveJobTrackerEntry("user-1", {
      url: URL,
      title: "Engineer",
      company: "Acme",
      description: LONG_JD,
    });

    expect(prisma.jobTrackerEntry.create).not.toHaveBeenCalled();
    expect(prisma.jobTrackerEntry.update).toHaveBeenCalled();
    expect(saved.id).toBe("entry-progress");
  });

  it("archives APPLIED row and creates fresh CAPTURED on re-apply", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "entry-applied" } as never);

    vi.mocked(prisma.jobTrackerEntry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.jobTrackerEntry.create).mockResolvedValue({
      id: "entry-new",
      status: "CAPTURED",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: URL,
    } as never);

    const saved = await saveJobTrackerEntry("user-1", {
      url: URL,
      title: "Engineer",
      company: "Acme",
      description: LONG_JD,
    });

    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry-applied", userId: "user-1" },
        data: expect.objectContaining({ status: "ARCHIVED" }),
      }),
    );
    expect(prisma.jobTrackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", status: "CAPTURED" }),
      }),
    );
    expect(saved.id).toBe("entry-new");
  });
});

describe("findActiveJobTrackerEntryForUrl", () => {
  it("queries by userId and urlHash", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);
    await findActiveJobTrackerEntryForUrl("user-1", URL);
    expect(prisma.jobTrackerEntry.findFirst).toHaveBeenCalled();
  });
});
