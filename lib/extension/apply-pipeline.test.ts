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
  updateJobTrackerStatus: vi.fn(),
}));

vi.mock("@/lib/extension/capture-job", () => ({
  captureJob: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-tailor", () => ({
  buildTailorInputFromSave: vi.fn((entryId: string, input: { title: string }) => ({
    entryId,
    jobTitle: input.title,
  })),
  runPipelineTailor: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-metadata", () => ({
  mergeJobEntryMetadata: vi.fn(),
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
import { captureJob } from "@/lib/extension/capture-job";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";
import { runPipelineTailor } from "@/lib/extension/pipeline-tailor";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";
import { hasJobResumeTailor } from "@/lib/profile/job-resume-tailor";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { isFeatureEnabled } from "@/src/lib/services/feature-flags-service";

const LONG_JD = "Job Description\n\n" + "Requirements for this role. ".repeat(20);

const APPLY_URL = "https://acme.myworkdayjobs.com/job/eng";

describe("runApplyPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({
      autoApplyUserSwitch: true,
      resumeProfilePickerMode: "DEFAULT",
      customizeResume: true,
      aiSourcePreference: "auto",
      applicationProfile: null,
    });
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockImplementation(async (args) => {
      const select = (args as { select?: { canonicalUrl?: boolean; status?: boolean } }).select;
      if (select?.canonicalUrl) {
        return { canonicalUrl: APPLY_URL } as never;
      }
      if (select?.status) {
        return { status: "RESUME_READY" } as never;
      }
      return null;
    });
    vi.mocked(hasJobResumeTailor).mockResolvedValue(false);
    vi.mocked(updateJobTrackerStatus).mockResolvedValue({ count: 1 });
  });

  it("runs tailor for Workday and auto-advances to READY_TO_APPLY", async () => {
    vi.mocked(captureJob).mockResolvedValue({
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
    expect(updateJobTrackerStatus).toHaveBeenCalledWith("user-1", "entry-1", "READY_TO_APPLY");
    expect(result).toMatchObject({
      success: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
      phases: ["capture", "tailor"],
      pendingPhase: "autofill",
      hasTailoredResume: true,
      sourceProfileId: "source-1",
    });
  });

  it("runs tailor for non-one-click platforms and returns READY_TO_APPLY without autofill phase", async () => {
    vi.mocked(captureJob).mockResolvedValue({
      id: "entry-linkedin",
      status: "CAPTURED",
      title: "Engineer",
      company: "Acme",
      canonicalUrl: "https://www.linkedin.com/jobs/view/123",
    } as never);
    vi.mocked(runPipelineTailor).mockResolvedValue({
      success: true,
      jobTrackerEntryId: "entry-linkedin",
      sourceProfileId: "source-1",
      phases: ["capture", "tailor"],
    });

    const result = await runApplyPipeline("user-1", {
      url: "https://www.linkedin.com/jobs/view/123",
      title: "Engineer",
      platform: "linkedin",
      description: LONG_JD,
    });

    expect(runPipelineTailor).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      status: "READY_TO_APPLY",
      pendingPhase: null,
    });
  });

  it("returns saved CAPTURED when tailor fails after save", async () => {
    vi.mocked(captureJob).mockResolvedValue({
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
    expect(updateJobTrackerStatus).not.toHaveBeenCalled();
  });

  it("skips tailor when entry is already tailored and ensures READY_TO_APPLY", async () => {
    vi.mocked(captureJob).mockResolvedValue({
      id: "entry-3",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: APPLY_URL,
    } as never);
    vi.mocked(hasJobResumeTailor).mockResolvedValue(true);

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
    });

    expect(runPipelineTailor).not.toHaveBeenCalled();
    expect(updateJobTrackerStatus).toHaveBeenCalledWith("user-1", "entry-3", "READY_TO_APPLY");
    expect(result).toMatchObject({
      success: true,
      status: "READY_TO_APPLY",
      pendingPhase: "autofill",
      hasTailoredResume: true,
    });
  });

  it("skips tailor when customizeResume is off and advances to READY_TO_APPLY", async () => {
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({
      autoApplyUserSwitch: true,
      resumeProfilePickerMode: "DEFAULT",
      customizeResume: false,
      aiSourcePreference: "auto",
      applicationProfile: null,
    });
    vi.mocked(captureJob).mockResolvedValue({
      id: "entry-no-customize",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);

    const result = await runApplyPipeline("user-1", {
      url: "https://acme.myworkdayjobs.com/job/eng",
      title: "Engineer",
      platform: "workday",
      description: LONG_JD,
    });

    expect(runPipelineTailor).not.toHaveBeenCalled();
    expect(updateJobTrackerStatus).toHaveBeenCalledWith(
      "user-1",
      "entry-no-customize",
      "READY_TO_APPLY",
    );
    expect(result).toMatchObject({
      success: true,
      status: "READY_TO_APPLY",
      phases: ["capture"],
      pendingPhase: "autofill",
    });
  });

  it("still runs tailor when autoApplyUserSwitch is off", async () => {
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({
      autoApplyUserSwitch: false,
      resumeProfilePickerMode: "DEFAULT",
      customizeResume: true,
      aiSourcePreference: "auto",
      applicationProfile: null,
    });
    vi.mocked(captureJob).mockResolvedValue({
      id: "entry-4",
      status: "CAPTURED",
      title: "Engineer",
      company: null,
      canonicalUrl: "https://acme.myworkdayjobs.com/job/eng",
    } as never);
    vi.mocked(runPipelineTailor).mockResolvedValue({
      success: true,
      jobTrackerEntryId: "entry-4",
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
      status: "READY_TO_APPLY",
      pendingPhase: null,
    });
  });
});
