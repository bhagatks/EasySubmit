import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSubscriptionFeature } from "@/lib/features/resolve-subscription";

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(async () => ({
    enabled: true,
    currency: "usd",
    plans: {
      pro: { dailyEnhancements: 100, price: 19 },
    },
  })),
  isSubscribed: vi.fn(() => false),
}));

import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";

const freeUser = { plan: "free", subscriptionStatus: null };
const proUser = { plan: "pro", subscriptionStatus: "active" };
const cancelledUser = { plan: "pro", subscriptionStatus: "cancelled" };

describe("resolveSubscriptionFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAppConfig).mockResolvedValue({
      enabled: true,
      currency: "usd",
      plans: { pro: { dailyEnhancements: 100, price: 19 } },
    } as Awaited<ReturnType<typeof getAppConfig>>);
    vi.mocked(isSubscribed).mockReturnValue(false);
  });

  it("free user: not subscribed, upgrade nudge shown on job_apply", async () => {
    const result = await resolveSubscriptionFeature(freeUser, "job_apply");
    expect(result.isSubscribed).toBe(false);
    expect(result.showUpgradeNudge).toBe(true);
    expect(result.canUpgrade).toBe(true);
    expect(result.limits.unlimited).toBe(false);
  });

  it("free user: no upgrade nudge on extension surface", async () => {
    const result = await resolveSubscriptionFeature(freeUser, "extension");
    expect(result.showUpgradeNudge).toBe(false);
  });

  it("subscribed user: unlimited, no nudge", async () => {
    vi.mocked(isSubscribed).mockReturnValue(true);
    const result = await resolveSubscriptionFeature(proUser, "job_apply");
    expect(result.isSubscribed).toBe(true);
    expect(result.showUpgradeNudge).toBe(false);
    expect(result.limits.unlimited).toBe(true);
    expect(result.canUpgrade).toBe(false);
  });

  it("cancelled user: treated as not subscribed", async () => {
    vi.mocked(isSubscribed).mockReturnValue(false);
    const result = await resolveSubscriptionFeature(cancelledUser, "job_apply");
    expect(result.isSubscribed).toBe(false);
    expect(result.showUpgradeNudge).toBe(true);
  });

  it("upgrade nudge shown on onboarding", async () => {
    const result = await resolveSubscriptionFeature(freeUser, "onboarding");
    expect(result.showUpgradeNudge).toBe(true);
  });

  it("canUpgrade false when subscriptions disabled", async () => {
    vi.mocked(getAppConfig).mockResolvedValue({
      enabled: false,
      currency: "usd",
      plans: {},
    } as Awaited<ReturnType<typeof getAppConfig>>);
    const result = await resolveSubscriptionFeature(freeUser, "job_apply");
    expect(result.canUpgrade).toBe(false);
  });
});
