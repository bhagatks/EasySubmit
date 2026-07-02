import { describe, expect, it } from "vitest";
import {
  buildPricingDisplayPlans,
  formatSubscriptionPrice,
  FREE_PLAN_ALL_FEATURES,
  PAID_PLAN_ALL_FEATURES,
} from "@/lib/pricing/plan-display";
import { SUBSCRIPTION_CONFIG_DEFAULTS } from "@/src/lib/services/subscription-config";

describe("formatSubscriptionPrice", () => {
  it("formats integer price without decimals", () => {
    expect(formatSubscriptionPrice(10)).toBe("$10");
  });

  it("formats decimal price with 2 decimal places", () => {
    expect(formatSubscriptionPrice(9.99)).toBe("$9.99");
  });

  it("formats zero", () => {
    expect(formatSubscriptionPrice(0)).toBe("$0");
  });
});

describe("buildPricingDisplayPlans", () => {
  it("builds free pill and expandable feature sets", () => {
    const plans = buildPricingDisplayPlans({
      ...SUBSCRIPTION_CONFIG_DEFAULTS,
      enabled: false,
    });
    const free = plans.find((p) => p.id === "free");
    expect(free?.tiers).toEqual([{ label: "Your key", detail: "Daily limit applies" }]);
    expect(free?.visibleFeatures).toHaveLength(5);
    expect(free?.allFeatures).toEqual([...FREE_PLAN_ALL_FEATURES]);
  });

  it("marks paid plans coming soon when subscriptions disabled", () => {
    const plans = buildPricingDisplayPlans({
      ...SUBSCRIPTION_CONFIG_DEFAULTS,
      enabled: false,
    });
    expect(plans.find((p) => p.id === "weekly")?.comingSoon).toBe(true);
    expect(plans.find((p) => p.id === "monthly")?.savingsNote).toMatch(
      /Saves ~\$3\.97 vs weekly/,
    );
  });

  it("uses paid feature lists with 19 expanded items and no BYOK on paid", () => {
    const plans = buildPricingDisplayPlans({
      ...SUBSCRIPTION_CONFIG_DEFAULTS,
      enabled: false,
    });
    const yearly = plans.find((p) => p.id === "yearly");
    expect(yearly?.allFeatures).toEqual([...PAID_PLAN_ALL_FEATURES]);
    expect(yearly?.allFeatures).toHaveLength(19);
    expect(yearly?.allFeatures).not.toContain("Connect your own AI key");
    expect(yearly?.savingsNote).toMatch(/saves \$35\.89 vs monthly/);
    expect(yearly?.tiers[0]).toEqual({
      label: "EasySubmit.ai",
      detail: "No API key required",
    });
  });

  it("sets live CTAs when subscriptions enabled", () => {
    const plans = buildPricingDisplayPlans({
      ...SUBSCRIPTION_CONFIG_DEFAULTS,
      enabled: true,
    });
    const weekly = plans.find((p) => p.id === "weekly");
    const monthly = plans.find((p) => p.id === "monthly");
    const yearly = plans.find((p) => p.id === "yearly");
    expect(weekly?.comingSoon).toBe(false);
    expect(weekly?.cta).toBe("Subscribe");
    expect(weekly?.ctaHref).toBe("/dashboard/billing");
    expect(monthly?.cta).toBe("Subscribe");
    expect(yearly?.cta).toBe("Subscribe");
  });
});
