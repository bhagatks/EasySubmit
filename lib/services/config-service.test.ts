import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appConfig: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  DATA_REFRESH_SAFETY_DEFAULT,
  getAppConfig,
  type AppConfigSnapshot,
  type DataRefreshConfig,
} from "@/src/lib/services/config-service";

describe("getAppConfig", () => {
  beforeEach(() => {
    vi.mocked(prisma.appConfig.findMany).mockReset();
  });

  it("returns safety default when dataRefresh row is missing", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const config = await getAppConfig();

    expect(config.dataRefresh).toEqual<DataRefreshConfig>({ interval: 1440 });
    expect(config.dataRefresh.interval).toBe(1440);
    expect(config.aiConfig).toBeNull();
    expect(config.aiPricingMap.default.inputPer1k).toBeGreaterThan(0);
  });

  it("returns dataRefresh only when keyed accessor is used", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "dataRefresh",
        value: { interval: 720 },
      },
    ]);

    const config = await getAppConfig("dataRefresh");

    expect(config).toEqual({ interval: 720 });
    expect(config.interval).toBe(720);
  });

  it("parses dataRefresh interval from the database as minutes", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "dataRefresh",
        value: {
          aiModelsUpdate: 720,
          interval: 720,
          description: "Twelve hours",
        },
      },
    ]);

    const config: AppConfigSnapshot = await getAppConfig();

    expect(config.dataRefresh.interval).toBe(720);
    expect(config.dataRefresh.aiModelsUpdate).toBe(720);
    expect(config.dataRefresh.description).toBe("Twelve hours");
  });

  it("falls back to safety default when dataRefresh interval is invalid", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "dataRefresh",
        value: { interval: "1440" },
      },
    ]);

    const config = await getAppConfig("dataRefresh");

    expect(config).toEqual(DATA_REFRESH_SAFETY_DEFAULT);
  });

  it("includes aiConfig when present", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "dataRefresh",
        value: { interval: 1440 },
      },
      {
        key: "aiConfig",
        value: {
          defaultProvider: "openai",
          discoveryEnabled: true,
          lastGlobalSync: "2026-06-19T12:00:00.000Z",
        },
      },
    ]);

    const config = await getAppConfig();

    expect(config.dataRefresh.interval).toBe(1440);
    expect(config.aiConfig).toEqual({
      defaultProvider: "openai",
      discoveryEnabled: true,
      lastGlobalSync: "2026-06-19T12:00:00.000Z",
    });
  });

  it("loads ai_pricing_map when keyed accessor is used", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "ai_pricing_map",
        value: {
          default: { inputPer1k: 0.001, outputPer1k: 0.002 },
          models: {},
          patterns: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const map = await getAppConfig("ai_pricing_map");

    expect(map.default).toEqual({ inputPer1k: 0.001, outputPer1k: 0.002 });
  });

  it("loads enhanceWithAi timeout from the database", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "enhanceWithAi",
        value: { enhanceWithAiTimeoutMs: 25_000 },
      },
    ]);

    const config = await getAppConfig("enhanceWithAi");

    expect(config.enhanceWithAiTimeoutMs).toBe(25_000);
  });

  it("falls back to 90s enhance timeout when row is missing", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const snapshot = await getAppConfig();

    expect(snapshot.enhanceWithAi.enhanceWithAiTimeoutMs).toBe(90_000);
  });

  it("loads aiEngine defaults when row is missing", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const snapshot = await getAppConfig();

    expect(snapshot.aiEngine.system.modelId).toBe("gemini-2.5-flash-lite");
    expect(snapshot.aiEngine.system.maxKeySlots).toBe(3);
    expect(snapshot.aiEngine.quotas.system.enable).toBe(true);
    expect(snapshot.aiEngine.quotas.system.dailyEnhancements).toBe(5);
    expect(snapshot.aiEngine.quotas.customer.aiDailyUnlimited).toBe(true);
    expect(snapshot.aiEngine.customerDailyEnhancementCap).toBe(50);
  });

  it("parses aiEngine from database", async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      {
        key: "aiEngine",
        value: {
          system: { modelId: "gemini-2.5-flash", maxKeySlots: 3 },
          quotas: {
            system: { enable: true, dailyEnhancements: 8, dailyCalls: 30 },
            customer: { aiDailyUnlimited: false, dailyEnhancements: 40, dailyCalls: 150 },
          },
          customerDailyEnhancementCap: 40,
        },
      },
    ]);

    const engine = await getAppConfig("aiEngine");

    expect(engine.system.modelId).toBe("gemini-2.5-flash");
    expect(engine.quotas.system.dailyEnhancements).toBe(8);
    expect(engine.customerDailyEnhancementCap).toBe(40);
  });
});
