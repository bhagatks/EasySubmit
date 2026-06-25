import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    apiCallLog: { count: vi.fn() },
  },
}));
vi.mock("@/lib/ai/ai-readiness-gate-for-user", () => ({
  getAiReadinessForUser: vi.fn(),
}));

import { getAiHealthStatusForUser } from "@/lib/ai/ai-health-status";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import { prisma } from "@/lib/prisma";

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
});
