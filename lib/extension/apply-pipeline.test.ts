import { describe, expect, it, vi, beforeEach } from "vitest";
import { runApplyPipeline } from "@/lib/extension/apply-pipeline";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/extension/job-service", () => ({
  saveJobTrackerEntry: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-tailor", () => ({
  buildTailorInputFromSave: vi.fn((entryId: string, input: { title: string }) => ({
    entryId,
    jobTitle: input.title,
  })),
  runPipelineTailor: vi.fn(),
}));

vi.mock("@/lib/profile/job-resume-tailor", () => ({
  hasJobResumeTailor: vi.fn(),
}));

vi.mock("@/lib/extension/user-prefs", () => ({
  getExtensionUserPrefs: vi.fn(),
}));

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  FEATURE_FLAG_KEYS: { extensionAutoApply: "extension_auto_apply" },
  isFeatureEnabled: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { saveJobTrackerEntry } from "@/lib/extension/job-service";
import { runPipelineTailor } from "@/lib/extension/pipeline-tailor";
import { hasJobResumeTailor } from "@/lib/profile/job-resume-tailor";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { isFeatureEnabled } from "@/src/lib/services/feature-flags-service";

const LONG_JD = "Job Description\n\n" + "Requirements for this role. ".repeat(20);

describe("runApplyPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({ oneClickApply: true });
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue(null);
    vi.mocked(hasJobResumeTailor).mockResolvedValue(false);
  });

  it("runs tailor after capture for Workday one-click", async () => {
    vi.mocked(saveJobTrackerEntry).mockResolvedValue({
      id: "entry-1",
      status: "CAPTURED",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);
    vi.mocked(runPipelineTailor).mockResolvedValue({
      success: true,
      jobTrackerEntryId: "entry-1",
      sourceProfileId: "source-1",
      phases: ["capture", "tailor"],
    });

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
      description: LONG_JD,
    });

    expect(runPipelineTailor).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      id: "entry-1",
      status: "RESUME_READY",
      phases: ["capture", "tailor"],
      pendingPhase: "autofill",
      hasTailoredResume: true,
      sourceProfileId: "source-1",
    });
  });

  it("returns saved CAPTURED when tailor fails after save", async () => {
    vi.mocked(saveJobTrackerEntry).mockResolvedValue({
      id: "entry-2",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);
    vi.mocked(runPipelineTailor).mockResolvedValue({
      success: false,
      error: "Daily enhancement limit reached",
      code: "enhance_failed",
    });

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
      description: LONG_JD,
    });

    expect(result).toMatchObject({
      success: false,
      saved: true,
      id: "entry-2",
      status: "CAPTURED",
      code: "enhance_failed",
    });
  });

  it("skips tailor when entry is already RESUME_READY with overrides", async () => {
    vi.mocked(saveJobTrackerEntry).mockResolvedValue({
      id: "entry-3",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      status: "RESUME_READY",
    } as never);
    vi.mocked(hasJobResumeTailor).mockResolvedValue(true);

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
    });

    expect(runPipelineTailor).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      status: "RESUME_READY",
      pendingPhase: "autofill",
      hasTailoredResume: true,
    });
  });

  it("save-only when one-click is disabled", async () => {
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({ oneClickApply: false });
    vi.mocked(saveJobTrackerEntry).mockResolvedValue({
      id: "entry-4",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
    });

    expect(runPipelineTailor).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, pendingPhase: null });
  });
});
