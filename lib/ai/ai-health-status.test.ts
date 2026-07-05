import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userApiKey: { findUnique: vi.fn().mockResolvedValue(null) },
    apiCallLog: { count: vi.fn() },
  },
}));
vi.mock("@/lib/ai/ai-readiness-gate-for-user", () => ({
  getAiReadinessForUser: vi.fn(),
}));
vi.mock("@/lib/ai/ai-global-enabled", () => ({
  isAiGloballyEnabled: vi.fn(() => true),
}));

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  getFeatureFlags: vi.fn(),
  isSystemAiEnabled: vi.fn(() => true),
  FEATURE_FLAGS_DEFAULTS: {
    enhanceWithAiResumeProfile: true,
    extensionGlobalSwitch: true,
    extensionAutoApply: true,
    extensionApplyPipelineStepAnalytics: false,
    systemAiEnabled: true,
    aiJdExtractEnabled: false,
    resumeRulesV2: true,
  },
}));

vi.mock("@/lib/vault/user-key-vault", () => ({
  getActiveVaultKeyUpdatedAt: vi.fn(),
}));

import { getAiHealthStatusForUser } from "@/lib/ai/ai-health-status";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import { prisma } from "@/lib/prisma";
import { getFeatureFlags, FEATURE_FLAGS_DEFAULTS } from "@/src/lib/services/feature-flags-service";
import { getActiveVaultKeyUpdatedAt } from "@/lib/vault/user-key-vault";

const healthyReadiness = {
  status: { ok: true as const },
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
    applies: false,
    valid: true,
    reason: null,
    message: null,
    code: null,
    lastJobFailure: null,
  },
};

describe("getAiHealthStatusForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveVaultKeyUpdatedAt).mockResolvedValue(null);
    vi.mocked(getFeatureFlags).mockResolvedValue(FEATURE_FLAGS_DEFAULTS);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: "vault-1",
      aiSourcePreference: "customer",
      activeProvider: "gemini",
    } as never);
    vi.mocked(prisma.apiCallLog.count).mockResolvedValue(0);
    vi.mocked(getAiReadinessForUser).mockResolvedValue(healthyReadiness);
  });

  it("returns readiness quota block directly", async () => {
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      ...healthyReadiness,
      reason: "enhancement_limit",
      status: {
        ok: false,
        code: "quota_exhausted",
        message: "Daily enhancement limit reached (5/day). Add your API key for more.",
      },
      systemQuota: {
        applies: true,
        exceeded: true,
        reason: "enhancement_limit",
        message: "Daily enhancement limit reached (5/day). Add your API key for more.",
        code: "quota_enhancement",
        snapshot: null,
      },
    });

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({
      ok: false,
      code: "quota_exhausted",
      message: "Daily enhancement limit reached (5/day). Add your API key for more.",
    });
  });

  it("returns readiness BYOK last-job failure message", async () => {
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      ...healthyReadiness,
      reason: "last_job_key_failure",
      status: {
        ok: false,
        code: "key_invalid",
        message:
          "Your last job (Senior Engineer at Acme) failed because of your API key. Verify your key in AI Keys.",
      },
      byokKey: {
        applies: true,
        valid: false,
        reason: "last_job_key_failure",
        message:
          "Your last job (Senior Engineer at Acme) failed because of your API key. Verify your key in AI Keys.",
        code: "key_invalid",
        lastJobFailure: {
          entryId: "job-1",
          title: "Senior Engineer",
          company: "Acme",
          error: "API key was rejected",
          code: "provider_error",
          failedAt: new Date(),
        },
      },
    });

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toMatchObject({ ok: false, code: "key_invalid" });
    expect(status.ok === false && status.message).toContain("Your last job");
  });

  it("maps recent pool_exhausted logs to shared quota message on system route", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: null,
      aiSourcePreference: "system",
      activeProvider: null,
    } as never);
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      ...healthyReadiness,
      systemQuota: {
        applies: true,
        exceeded: false,
        reason: null,
        message: null,
        code: null,
        snapshot: null,
      },
    });

    vi.mocked(prisma.apiCallLog.count).mockImplementation((async (args: unknown) => {
      const where = (args as { where?: { errorCode?: { in?: string[] }; aiMode?: string } })?.where;
      if (where?.aiMode !== "system") return 0;
      const codes = where?.errorCode?.in ?? [];
      if (codes.includes("pool_exhausted")) return 2;
      return 0;
    }) as never);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({
      ok: false,
      code: "quota_exhausted",
      message:
        "EasySubmit AI hit its daily limit. Add your API key in AI Keys for unlimited use.",
    });
  });

  it("returns healthy when no vault key but system AI readiness passes", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: null,
      aiSourcePreference: "auto",
      activeProvider: null,
    } as never);
    vi.mocked(getAiReadinessForUser).mockResolvedValue(healthyReadiness);
    vi.mocked(prisma.apiCallLog.count).mockResolvedValue(0);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({ ok: true });
  });

  it("returns ai_disabled when user turned off AI enhancements", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: "vault-1",
      aiSourcePreference: "disabled",
      activeProvider: "gemini",
    } as never);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toMatchObject({
      ok: false,
      code: "ai_disabled",
    });
    expect(getAiReadinessForUser).not.toHaveBeenCalled();
  });

  it("returns shared_ai_unavailable when system AI is off and no BYOK key", async () => {
    const { isSystemAiEnabled } = await import("@/src/lib/services/feature-flags-service");
    vi.mocked(isSystemAiEnabled).mockReturnValue(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: null,
      aiSourcePreference: "auto",
      activeProvider: null,
    } as never);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toMatchObject({
      ok: false,
      code: "shared_ai_unavailable",
    });
    expect(getAiReadinessForUser).not.toHaveBeenCalled();
  });

  it("ignores stale BYOK api errors logged before the key was updated", async () => {
    const keyUpdatedAt = new Date(Date.now() - 5 * 60 * 1000);
    vi.mocked(getActiveVaultKeyUpdatedAt).mockResolvedValue(keyUpdatedAt);
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      ...healthyReadiness,
      byokKey: { ...healthyReadiness.byokKey, applies: true, valid: true },
    });

    vi.mocked(prisma.apiCallLog.count).mockResolvedValue(0);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({ ok: true });

    const customerErrorCalls = vi
      .mocked(prisma.apiCallLog.count)
      .mock.calls.filter((call) => {
        const where = (call[0] as {
          where?: { aiMode?: string; status?: string; createdAt?: { gte?: Date } };
        })?.where;
        return where?.aiMode === "customer" && where?.status === "error";
      });
    expect(customerErrorCalls.length).toBeGreaterThan(0);
    for (const call of customerErrorCalls) {
      const gte = (call[0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte;
      expect(gte.getTime()).toBe(keyUpdatedAt.getTime());
    }
  });

  it("ignores stale system pool errors when user routes to My key (BYOK)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: "vault-1",
      aiSourcePreference: "customer",
      activeProvider: "gemini",
    } as never);
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      ...healthyReadiness,
      byokKey: { ...healthyReadiness.byokKey, applies: true, valid: true },
    });

    vi.mocked(prisma.apiCallLog.count).mockImplementation((async (args: unknown) => {
      const where = (args as { where?: { aiMode?: string; status?: string } })?.where;
      if (where?.aiMode === "customer") return 0;
      if (where?.aiMode === "system" && where?.status === "error") return 5;
      return 0;
    }) as never);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({ ok: true });
  });
});
