import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  findActiveJobTrackerEntryForUrl,
  getJobTrackerStatusForUrl,
  loadTailorInputFromEntry,
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
      location: null,
      salaryText: null,
      description: LONG_JD,
      platform: "workday",
      metadata: {},
    } as never);

    const status = await getJobTrackerStatusForUrl("user-1", URL);

    expect(status).toEqual({
      saved: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
      title: "Engineer",
      canReapply: false,
      issueMessage: null,
      pipelineAiWarning: null,
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

  it("returns server pipeline issue message for extension sync", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      id: "entry-2",
      status: "CAPTURED",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: URL,
      location: null,
      salaryText: null,
      description: LONG_JD,
      platform: "workday",
      metadata: { pipelineError: "Tailor failed" },
    } as never);

    const status = await getJobTrackerStatusForUrl("user-1", URL);
    expect(status.issueMessage).toBe("Tailor failed");
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
    expect(prisma.jobTrackerEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry-progress" },
        data: expect.objectContaining({
          status: "CAPTURED",
          appliedAt: null,
        }),
      }),
    );
    expect(saved.id).toBe("entry-progress");
  });

  it("resets READY_TO_APPLY back to CAPTURED when capturing again", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValueOnce({
      id: "entry-ready",
      status: "READY_TO_APPLY",
      title: "Old",
      company: null,
      canonicalUrl: URL,
    } as never);

    vi.mocked(prisma.jobTrackerEntry.update).mockResolvedValue({
      id: "entry-ready",
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

    expect(prisma.jobTrackerEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CAPTURED", appliedAt: null }),
      }),
    );
    expect(saved.status).toBe("CAPTURED");
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

  it("archives duplicate active rows for the same URL hash", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValueOnce({
      id: "entry-progress",
      status: "READY_TO_APPLY",
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
    vi.mocked(prisma.jobTrackerEntry.updateMany).mockResolvedValue({ count: 1 });

    await saveJobTrackerEntry("user-1", {
      url: URL,
      title: "Engineer",
      company: "Acme",
      description: LONG_JD,
    });

    expect(prisma.jobTrackerEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          id: { not: "entry-progress" },
          archivedAt: null,
        }),
        data: expect.objectContaining({ status: "ARCHIVED" }),
      }),
    );
  });
});

describe("findActiveJobTrackerEntryForUrl", () => {
  it("queries by userId and urlHash", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);
    await findActiveJobTrackerEntryForUrl("user-1", URL);
    expect(prisma.jobTrackerEntry.findFirst).toHaveBeenCalled();
  });
});

describe("loadTailorInputFromEntry", () => {
  it("loads saved row fields for tailor without re-posting the capture payload", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      canonicalUrl: URL,
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: "$120k",
      description: LONG_JD,
      platform: "workday",
      metadata: { sourceProfileId: "profile-1" },
    } as never);

    const input = await loadTailorInputFromEntry("user-1", "entry-1");

    expect(input).toEqual({
      url: URL,
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: "$120k",
      description: LONG_JD,
      platform: "workday",
      sourceProfileId: "profile-1",
    });
  });

  it("returns null when the entry is missing", async () => {
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);
    await expect(loadTailorInputFromEntry("user-1", "missing")).resolves.toBeNull();
  });
});
