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

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(),
}));

vi.mock("@/src/lib/services/feature-flags-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/services/feature-flags-service")>();
  return {
    ...actual,
    getFeatureFlags: vi.fn(),
  };
});

vi.mock("@/src/lib/ai/engine/router", () => ({
  resolveAiRoute: vi.fn(),
}));

vi.mock("@/src/lib/ai/engine/run-enhance", () => ({
  runResumeEnhance: vi.fn(),
}));

vi.mock("@/app/actions/ai/usage-log", () => ({
  recordUsageLogForUser: vi.fn(),
}));

vi.mock("@/lib/ai/ai-readiness-gate-for-user", () => ({
  getAiReadinessForUser: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { runResumeEnhance } from "@/src/lib/ai/engine/run-enhance";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";

const baseForm = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "",
  cityState: "",
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

const defaultFlags = {
  enhanceWithAiOnboarding: true,
  enhanceWithAiResumeProfile: true,
  extensionGlobalSwitch: true,
  extensionAutoApply: true,
  systemAiEnabled: true,
};

describe("enhanceResumeForUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAppConfig).mockImplementation(async (key: string) => {
      if (key === "aiEngine") {
        return { systemAiEnabled: true, quotas: { customer: { aiDailyUnlimited: true } } };
      }
      return {};
    });
    vi.mocked(getFeatureFlags).mockResolvedValue(defaultFlags);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: "vault-1",
      activeProvider: "google",
      aiSourcePreference: "auto",
      aiEnhancementsToday: 0,
      aiCallsToday: 0,
      aiQuotaResetAt: new Date(),
    } as never);
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      provider: "google",
      modelId: "gemini-test",
      apiKey: "secret",
    } as never);
    vi.mocked(runResumeEnhance).mockResolvedValue({
      ok: true,
      form: baseForm,
      changedSections: ["skills"],
      targetRole: "Senior Engineer",
      modelId: "gemini-test",
      tokensUsed: 10,
      apiCallCount: 1,
      estimatedCost: 0.001,
      partialEnhance: false,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      status: { ok: true },
      reason: "healthy",
      systemQuota: {
        applies: false,
        exceeded: false,
        reason: null,
        message: null,
        code: null,
        snapshot: null,
      },
      byokKey: {
        applies: true,
        valid: true,
        reason: null,
        message: null,
        code: null,
        lastJobFailure: null,
      },
    });
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

  it("blocks pipeline variant when resume-profile enhance is off", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      ...defaultFlags,
      enhanceWithAiResumeProfile: false,
    });

    const result = await enhanceResumeForUserId("user-1", {
      form: baseForm,
      targetRole: "Senior Engineer",
      variant: "pipeline",
    });

    expect(result).toEqual({
      success: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    });
    expect(runResumeEnhance).not.toHaveBeenCalled();
  });

  it("allows pipeline variant when resume-profile enhance is on", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      ...defaultFlags,
      extensionAutoApply: false,
    });

    const result = await enhanceResumeForUserId("user-1", {
      form: baseForm,
      targetRole: "Senior Engineer",
      jobDescription: "Build scalable systems.",
      variant: "pipeline",
    });

    expect(result.success).toBe(true);
    expect(runResumeEnhance).toHaveBeenCalled();
  });

  it("runs enhance without a NextAuth session", async () => {
    const result = await enhanceResumeForUserId("user-1", {
      form: baseForm,
      targetRole: "Senior Engineer",
      jobDescription: "Build scalable systems.",
      rawResumeText: "Experience...",
      traceId: "pipeline-test",
      variant: "pipeline",
    });

    expect(result.success).toBe(true);
    expect(runResumeEnhance).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        targetRole: "Senior Engineer",
        jobDescription: "Build scalable systems.",
      }),
      expect.anything(),
    );
  });
});
