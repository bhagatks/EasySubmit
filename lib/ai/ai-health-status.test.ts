import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    apiCallLog: { count: vi.fn() },
  },
}));
vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn().mockResolvedValue({
    quotas: { system: { dailyEnhancements: 5, dailyCalls: 50 } },
  }),
}));

import { getAiHealthStatusForUser } from "@/lib/ai/ai-health-status";
import { prisma } from "@/lib/prisma";

describe("getAiHealthStatusForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flags system quota exhaustion when on system AI without BYOK", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: null,
      aiSourcePreference: "system",
      aiEnhancementsToday: 5,
      aiCallsToday: 0,
    } as never);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toEqual({
      ok: false,
      code: "quota_exhausted",
      message: "Daily AI quota used up. Add your own API key for unlimited use.",
    });
  });

  it("queries BYOK failures with aiMode customer (not keySource customer)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultKeyId: "vault-1",
      aiSourcePreference: "customer",
      aiEnhancementsToday: 0,
      aiCallsToday: 0,
    } as never);
    vi.mocked(prisma.apiCallLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const status = await getAiHealthStatusForUser("user-1");
    expect(status).toMatchObject({ ok: false, code: "key_invalid" });
    expect(prisma.apiCallLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aiMode: "customer",
          status: "error",
        }),
      }),
    );
  });
});
