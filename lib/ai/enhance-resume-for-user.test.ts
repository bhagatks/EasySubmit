import { describe, expect, it, vi, beforeEach } from "vitest";
import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/job-tracker/enhance/run-resume-enhance-pipeline", () => ({
  runResumeEnhancePipeline: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { runResumeEnhancePipeline } from "@/lib/job-tracker/enhance/run-resume-enhance-pipeline";

const baseForm = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "",
  cityState: "",
  linkedIn: "",
  professionalSummary: "",
  skillsText: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
};

const pipelineSuccess = {
  success: true as const,
  form: baseForm,
  baselineForm: baseForm,
  brief: {} as never,
  changedSections: ["skills"] as never[],
  targetRole: "Senior Engineer",
  engineMode: "ai" as const,
  baselineApplied: true as const,
  aiAttempted: true,
  aiSucceeded: true,
  quota: {
    enhancementsUsed: 1,
    enhancementsLimit: 10,
    callsUsed: 1,
    callsLimit: 20,
  },
  aiMode: "system" as const,
  enhanceSummary: "Enhanced",
  traceId: "t1",
  sessionMeta: {} as never,
  skillsAdded: [],
};

describe("enhanceResumeForUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      vaultKeyId: "vault-1",
      activeProvider: "google",
      aiSourcePreference: "auto",
      aiEnhancementsToday: 0,
      aiCallsToday: 0,
      aiQuotaResetAt: new Date(),
      plan: "free",
      subscriptionStatus: null,
    } as never);
    vi.mocked(runResumeEnhancePipeline).mockResolvedValue(pipelineSuccess);
  });

  it("returns unauthorized when user is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await enhanceResumeForUserId("missing-user", {
      form: baseForm,
      targetRole: "Senior Engineer",
      variant: "pipeline",
    });

    expect(result).toEqual({
      success: false,
      error: "Account not found.",
      code: "unauthorized",
    });
  });

  it("returns baseline success when pipeline succeeds with AI blocked", async () => {
    vi.mocked(runResumeEnhancePipeline).mockResolvedValue({
      ...pipelineSuccess,
      engineMode: "deterministic",
      aiAttempted: false,
      aiSucceeded: false,
      warning: "Daily AI limit reached. Baseline enhancements were applied.",
      aiBlockCode: "quota_exceeded",
    });

    const result = await enhanceResumeForUserId("user-1", {
      form: baseForm,
      targetRole: "Senior Engineer",
      jobDescription: "x".repeat(120),
      variant: "pipeline",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.engineMode).toBe("deterministic");
      expect(result.warning).toContain("Baseline");
    }
  });

  it("delegates to runResumeEnhancePipeline for pipeline variant", async () => {
    const result = await enhanceResumeForUserId("user-1", {
      form: baseForm,
      targetRole: "Senior Engineer",
      jobDescription: "Build scalable systems. ".repeat(10),
      variant: "pipeline",
    });

    expect(result.success).toBe(true);
    expect(runResumeEnhancePipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        targetRole: "Senior Engineer",
        surface: "extension",
      }),
    );
  });
});
