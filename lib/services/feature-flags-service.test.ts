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
  parseFeatureFlagExtra,
} from "@/src/lib/services/feature-flags-service";

const d = new Date();

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
      { key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile, enabled: false, description: null, extra: null, createdAt: d, updatedAt: d },
      { key: FEATURE_FLAG_KEYS.systemAiEnabled, enabled: false, description: null, extra: null, createdAt: d, updatedAt: d },
    ]);

    await expect(getFeatureFlags()).resolves.toEqual({
      enhanceWithAiResumeProfile: false,
      extensionGlobalSwitch: true,
      extensionAutoApply: true,
      extensionApplyPipelineStepAnalytics: false,
      systemAiEnabled: false,
      aiJdExtractEnabled: false,
    });
  });
});

describe("getFeatureFlag", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findUnique).mockReset();
  });

  it("returns enabled and parsed extra", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile,
      enabled: true,
      extra: { bannerText: "Beta" },
      description: null,
      createdAt: d,
      updatedAt: d,
    });

    await expect(getFeatureFlag(FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile)).resolves.toEqual({
      enabled: true,
      extra: { bannerText: "Beta" },
    });
  });

  it("returns null extra when column is empty", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile,
      enabled: false,
      extra: null,
      description: null,
      createdAt: d,
      updatedAt: d,
    });

    await expect(getFeatureFlag(FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile)).resolves.toEqual({
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
        key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile,
        enabled: false,
        extra: { note: "test" },
        description: null,
        createdAt: d,
        updatedAt: d,
      },
    ]);

    const result = await getFeatureFlagsWithExtra();
    expect(result[FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile]).toEqual({
      enabled: false,
      extra: { note: "test" },
    });
    expect(result[FEATURE_FLAG_KEYS.extensionGlobalSwitch]?.enabled).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  beforeEach(() => {
    vi.mocked(prisma.featureFlag.findUnique).mockReset();
  });

  it("returns stored value when row exists", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue({
      key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile,
      enabled: false,
      extra: null,
      description: null,
      createdAt: d,
      updatedAt: d,
    });

    await expect(isFeatureEnabled(FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile)).resolves.toBe(
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
