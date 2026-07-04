import { describe, expect, it, vi, beforeEach } from "vitest";
import { runPipelineTailor } from "@/lib/extension/pipeline-tailor";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

vi.mock("@/lib/ai/enhance-resume-for-user", () => ({
  enhanceResumeForUserId: vi.fn(),
}));

vi.mock("@/lib/profile/copy-profile-for-job", () => ({
  resolveSourceProfileForJob: vi.fn(),
}));

vi.mock("@/lib/job-tracker/persist-enhanced-resume", () => ({
  persistEnhancedResume: vi.fn(),
}));

vi.mock("@/lib/profile/studio-form-db", () => ({
  hubRefineryFormFromProfile: vi.fn(),
  targetTitleFromProfile: vi.fn(),
}));

vi.mock("@/lib/extension/job-service", () => ({
  updateJobTrackerStatus: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-metadata", () => ({
  mergeJobEntryMetadata: vi.fn(),
  recordPipelineTailorError: vi.fn(),
}));

vi.mock("@/lib/extension/pipeline-debug-hooks", () => ({
  pipelineDebugStep: vi.fn(),
  pipelineDebugAdvance: vi.fn(),
  pipelineDebugContext: vi.fn((userId?: string, entryId?: string) =>
    userId && entryId ? { userId, entryId } : null,
  ),
}));

vi.mock("@/src/lib/ai/engine/enhance-logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/ai/engine/enhance-logger")>();
  return {
    ...actual,
    createEnhanceTraceId: vi.fn(() => "trace-pipeline"),
    logEnhance: vi.fn(),
  };
});

import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import { resolveSourceProfileForJob } from "@/lib/profile/copy-profile-for-job";
import { persistEnhancedResume } from "@/lib/job-tracker/persist-enhanced-resume";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";
import { recordPipelineTailorError } from "@/lib/extension/pipeline-metadata";

const LONG_JD = "Job Description\n\n" + "Tailor me to this role. ".repeat(24);

const baseForm = {
  ...emptyHubRefineryForm(),
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  professionalSummary: "Base",
  skillsText: "TypeScript",
};

const sourceProfile = {
  id: "source-1",
  userId: "user-1",
  isDefault: true,
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  phone: null,
  city: null,
  country: null,
  targetTitle: "Engineering Manager",
  summary: "Base",
  skills: ["TypeScript"],
  resumeRawText: "raw",
  content: {},
  calibrationScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("runPipelineTailor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSourceProfileForJob).mockResolvedValue(sourceProfile);
    vi.mocked(hubRefineryFormFromProfile).mockReturnValue(baseForm);
    vi.mocked(targetTitleFromProfile).mockReturnValue("Engineering Manager");
    vi.mocked(enhanceResumeForUserId).mockResolvedValue({
      success: true,
      form: { ...baseForm, professionalSummary: "Tailored summary" },
      changedSections: ["professionalSummary"],
      targetRole: "Senior Engineer",
      quota: {
        enhancementsUsed: 1,
        enhancementsLimit: 10,
        callsUsed: 1,
        callsLimit: 10,
      },
      aiMode: "customer",
      engineMode: "ai",
      sessionMeta: {
        traceId: "trace-pipeline",
        engineMode: "ai",
        aiAttempted: true,
        aiSucceeded: true,
        enhanceSummary: null,
      },
    });
    vi.mocked(persistEnhancedResume).mockResolvedValue({
      success: true,
      changedSections: ["professionalSummary"],
    });
  });

  it("enhances source profile and saves overrides on the job", async () => {
    const result = await runPipelineTailor("user-1", {
      entryId: "entry-1",
      jobTitle: "Senior Engineer",
      jobDescription: LONG_JD,
      sourceProfileId: "source-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.jobTrackerEntryId).toBe("entry-1");
      expect(result.sourceProfileId).toBe("source-1");
      expect(result.phases).toEqual(["capture", "tailor"]);
    }
    expect(enhanceResumeForUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        variant: "pipeline",
        targetRole: "Senior Engineer",
        profileId: "source-1",
      }),
    );
    expect(persistEnhancedResume).toHaveBeenCalledWith(
      expect.objectContaining({
        enhanceMeta: expect.objectContaining({
          traceId: "trace-pipeline",
          engineMode: "ai",
          aiSucceeded: true,
        }),
      }),
    );
    expect(updateJobTrackerStatus).toHaveBeenCalledWith("user-1", "entry-1", "RESUME_READY");
  });

  it("blocks when job title and company are both missing for short JD", async () => {
    const result = await runPipelineTailor("user-1", {
      entryId: "entry-1",
      jobTitle: "Engineer",
      jobDescription: "Too short",
    });

    expect(result).toMatchObject({
      success: false,
      code: "missing_description",
    });
    expect(resolveSourceProfileForJob).not.toHaveBeenCalled();
    expect(recordPipelineTailorError).toHaveBeenCalled();
  });

  it("allows role + company when JD is short", async () => {
    const result = await runPipelineTailor("user-1", {
      entryId: "entry-1",
      jobTitle: "Senior Engineer",
      company: "Acme Corp",
      jobDescription: "Too short",
      sourceProfileId: "source-1",
    });

    expect(result.success).toBe(true);
    expect(enhanceResumeForUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        targetRole: "Senior Engineer",
        companyName: "Acme Corp",
        jobDescription: "Too short",
      }),
    );
  });

  it("records error when enhance fails", async () => {
    vi.mocked(enhanceResumeForUserId).mockResolvedValue({
      success: false,
      error: "Add an API key in AI Keys",
      code: "no_customer_key",
    });

    const result = await runPipelineTailor("user-1", {
      entryId: "entry-1",
      jobTitle: "Senior Engineer",
      jobDescription: LONG_JD,
    });

    expect(result.success).toBe(false);
    expect(persistEnhancedResume).not.toHaveBeenCalled();
    expect(recordPipelineTailorError).toHaveBeenCalled();
  });
});
