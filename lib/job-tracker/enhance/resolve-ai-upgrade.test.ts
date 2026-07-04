import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveAiUpgrade } from "@/lib/job-tracker/enhance/resolve-ai-upgrade";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

vi.mock("@/lib/features/resolve-enhance", () => ({
  resolveEnhanceFeature: vi.fn(),
}));

import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";

const baseUser: SystemQuotaUserRow = {
  id: "user-test",
  aiSourcePreference: "auto",
  vaultKeyId: null,
  activeProvider: null,
  plan: "free",
  subscriptionStatus: null,
  aiEnhancementsToday: 0,
  aiCallsToday: 0,
  aiQuotaResetAt: new Date(),
};

describe("resolveAiUpgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowed when enhance feature has route", async () => {
    vi.mocked(resolveEnhanceFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: true,
      available: true,
      route: { mode: "system", provider: "gemini", modelId: "gemini-1.5-flash" },
      mode: "system",
      vaultKeyId: null,
      provider: null,
      modelId: "gemini-1.5-flash",
      quota: { used: 0, limit: 10, unlimited: false },
      fallbackAvailable: true,
    });

    const result = await resolveAiUpgrade(baseUser, "job_apply");
    expect(result.aiAllowed).toBe(true);
    expect(result.route?.mode).toBe("system");
  });

  it("returns warning when AI unavailable", async () => {
    vi.mocked(resolveEnhanceFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: false,
      available: false,
      reason: "quota_exceeded",
      route: null,
      mode: null,
      vaultKeyId: null,
      provider: null,
      modelId: null,
      quota: { used: 5, limit: 5, unlimited: false },
      fallbackAvailable: true,
    });

    const result = await resolveAiUpgrade(baseUser, "job_apply");
    expect(result.aiAllowed).toBe(false);
    expect(result.warning).toMatch(/Daily AI limit/i);
  });
});
