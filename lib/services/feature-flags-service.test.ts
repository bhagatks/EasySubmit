import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAGS_DEFAULTS,
  getFeatureFlag,
  getFeatureFlags,
  getFeatureFlagsWithExtra,
  isFeatureEnabled,
  isEnhanceOnboardingVisible,
  parseFeatureFlagExtra,
} from "@/src/lib/services/feature-flags-service";

describe("parseFeatureFlagExtra", () => {
  it("returns null for non-objects", () => {
    expect(parseFeatureFlagExtra(null)).toBeNull();
    expect(parseFeatureFlagExtra([])).toBeNull();
    expect(parseFeatureFlagExtra("nope")).toBeNull();
  });

  it("returns object payloads", () => {
    expect(parseFeatureFlagExtra({ rolloutPercent: 25 })).toEqual({
      rolloutPercent: 25,
    });
  });
});

describe("getFeatureFlags", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findMany).mockReset();
  });

  it("returns registry defaults when no rows exist", async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([]);

    await expect(getFeatureFlags()).resolves.toEqual(FEATURE_FLAGS_DEFAULTS);
  });

  it("merges database rows over defaults", async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([
      { key: FEATURE_FLAG_KEYS.enhanceWithAiOnboarding, enabled: false },
      { key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile, enabled: true },
    ]);

    await expect(getFeatureFlags()).resolves.toEqual({
      enhanceWithAiOnboarding: false,
      enhanceWithAiResumeProfile: true,
      extensionGlobalSwitch: true,
      extensionAutoApply: true,
      systemAiEnabled: true,
    });
  });
});

describe("getFeatureFlag", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findUnique).mockReset();
  });

  it("returns enabled and parsed extra", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      enabled: true,
      extra: { bannerText: "Beta" },
    });

    await expect(getFeatureFlag(FEATURE_FLAG_KEYS.enhanceWithAiOnboarding)).resolves.toEqual({
      enabled: true,
      extra: { bannerText: "Beta" },
    });
  });

  it("returns null extra when column is empty", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      enabled: false,
      extra: null,
    });

    await expect(getFeatureFlag(FEATURE_FLAG_KEYS.enhanceWithAiOnboarding)).resolves.toEqual({
      enabled: false,
      extra: null,
    });
  });
});

describe("getFeatureFlagsWithExtra", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findMany).mockReset();
  });

  it("includes registry defaults for missing rows", async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([
      {
        key: FEATURE_FLAG_KEYS.enhanceWithAiOnboarding,
        enabled: true,
        extra: { note: "test" },
      },
    ]);

    const result = await getFeatureFlagsWithExtra();
    expect(result[FEATURE_FLAG_KEYS.enhanceWithAiOnboarding]).toEqual({
      enabled: true,
      extra: { note: "test" },
    });
    expect(result[FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile]?.enabled).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findUnique).mockReset();
  });

  it("returns stored value when row exists", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      enabled: false,
      extra: null,
    });

    await expect(isFeatureEnabled(FEATURE_FLAG_KEYS.enhanceWithAiOnboarding)).resolves.toBe(
      false,
    );
  });

  it("falls back to registry default for known keys", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    await expect(isFeatureEnabled(FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile)).resolves.toBe(
      true,
    );
  });

  it("returns false for unknown keys", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    await expect(isFeatureEnabled("unknown_flag")).resolves.toBe(false);
  });
});

describe("isEnhanceOnboardingVisible", () => {
  it("requires feature flag and system AI enabled", () => {
    expect(
      isEnhanceOnboardingVisible({
        enhanceWithAiOnboarding: true,
        enhanceWithAiResumeProfile: true,
        extensionGlobalSwitch: true,
        extensionAutoApply: true,
        systemAiEnabled: true,
      }),
    ).toBe(true);

    expect(
      isEnhanceOnboardingVisible({
        enhanceWithAiOnboarding: true,
        enhanceWithAiResumeProfile: true,
        extensionGlobalSwitch: true,
        extensionAutoApply: true,
        systemAiEnabled: false,
      }),
    ).toBe(false);

    expect(
      isEnhanceOnboardingVisible({
        enhanceWithAiOnboarding: false,
        enhanceWithAiResumeProfile: true,
        extensionGlobalSwitch: true,
        extensionAutoApply: true,
        systemAiEnabled: true,
      }),
    ).toBe(false);
  });
});
